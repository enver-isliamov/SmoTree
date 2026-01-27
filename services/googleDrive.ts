
// Service to handle Google Drive API interactions

// Scope for creating and managing files created by this app
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'SmoTree.App';

let tokenClient: any;
let accessToken: string | null = null;
let tokenExpiration: number = 0;

export const GoogleDriveService = {
  
  /**
   * Initializes the Token Client. Must be called after Google Script loads.
   */
  init: (clientId: string) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
             accessToken = tokenResponse.access_token;
             // Token usually lasts 3599 seconds
             tokenExpiration = Date.now() + (Number(tokenResponse.expires_in) * 1000);
             // Dispatch event so UI can update
             window.dispatchEvent(new Event('drive-token-updated'));
          }
        },
      });
    } else {
      console.warn("Google Identity Services script not loaded.");
    }
  },

  /**
   * Triggers the OAuth popup to request access.
   */
  authorize: () => {
    if (!tokenClient) {
      console.error("Token Client not initialized. Check Client ID.");
      return;
    }
    // Request access token. 
    // We use requestAccessToken() which triggers the popup if no valid token exists in session.
    tokenClient.requestAccessToken();
  },

  isAuthenticated: (): boolean => {
    return !!accessToken && Date.now() < tokenExpiration;
  },

  getAccessToken: (): string | null => {
    if (GoogleDriveService.isAuthenticated()) {
        return accessToken;
    }
    return null;
  },

  /**
   * Finds the SmoTree.App folder or creates it if it doesn't exist.
   */
  ensureAppFolder: async (): Promise<string> => {
    if (!accessToken) throw new Error("No access token");

    // 1. Search for folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false&fields=files(id)`;
    
    const res = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();

    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const createData = await createRes.json();
    return createData.id;
  },

  /**
   * Uploads a file using the Resumable Upload protocol.
   * This supports large files (>5MB) unlike the multipart method.
   * Also sets permission to 'Anyone with the link' (Public Reader).
   */
  uploadFile: async (file: File, folderId: string, onProgress?: (percent: number) => void): Promise<{ id: string, name: string }> => {
     if (!accessToken) throw new Error("No access token");

     // Step 1: Initiate Resumable Upload Session
     const metadata = {
         name: file.name,
         parents: [folderId]
     };

     const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
         method: 'POST',
         headers: {
             'Authorization': `Bearer ${accessToken}`,
             'Content-Type': 'application/json',
             // Hints about the actual file content
             'X-Upload-Content-Type': file.type || 'application/octet-stream',
             'X-Upload-Content-Length': file.size.toString()
         },
         body: JSON.stringify(metadata)
     });

     if (!initResponse.ok) {
         const errText = await initResponse.text();
         throw new Error(`Drive Init Failed (${initResponse.status}): ${errText}`);
     }

     const sessionUri = initResponse.headers.get('Location');
     if (!sessionUri) {
         throw new Error("Drive API did not return a session URI. Upload cannot proceed.");
     }

     // Step 2: Upload Content to the Session URI
     return new Promise((resolve, reject) => {
         const xhr = new XMLHttpRequest();
         xhr.open('PUT', sessionUri);
         
         if (onProgress) {
             xhr.upload.onprogress = (e) => {
                 if (e.lengthComputable) {
                     const percent = Math.round((e.loaded / e.total) * 100);
                     onProgress(percent);
                 }
             };
         }

         xhr.onload = async () => {
             // 200 OK or 201 Created indicates success
             if (xhr.status === 200 || xhr.status === 201) {
                 try {
                     const response = JSON.parse(xhr.responseText);
                     
                     // Step 3: Make file Public (Anyone with link can read)
                     // This allows Guests to view the video without an access token
                     try {
                        await fetch(`https://www.googleapis.com/drive/v3/files/${response.id}/permissions`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                role: 'reader',
                                type: 'anyone'
                            })
                        });
                     } catch (permErr) {
                         console.warn("Failed to set public permission:", permErr);
                         // We still resolve, as the upload itself was successful. 
                         // The user might just face issues sharing it with guests later.
                     }

                     resolve(response);
                 } catch (e) {
                     reject(new Error(`Invalid JSON response: ${xhr.responseText}`));
                 }
             } else {
                 reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
             }
         };

         xhr.onerror = () => reject(new Error("Network error during upload"));
         
         xhr.send(file);
     });
  },

  /**
   * Returns a streaming URL for the file.
   * If authenticated, uses the API link with token.
   * If guest (no token), uses API Key fallback.
   */
  getVideoStreamUrl: (fileId: string): string => {
      // 1. If we have a token (Owner/Editor), use it. This is the most direct way.
      if (accessToken) {
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
      }
      
      // 2. Fallback for Guests: Use API Key.
      // This allows accessing the direct media stream for public files without triggering the virus scan HTML page.
      // REQUIRES: VITE_GOOGLE_API_KEY in .env
      const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
      if (apiKey) {
         // Debug to confirm key is loaded
         console.log("Using Public Drive API Key for playback");
         return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      }

      // 3. Last resort fallback (Unreliable for large files due to virus scan interstitial)
      console.warn("No API Key found for Guest Playback. Falling back to web link (unreliable).");
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
};
