
// Service to handle Google Drive API interactions

// Scope for creating and managing files created by this app
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'SmoTree.App';
const CONNECTED_KEY = 'smotree_drive_connected_flag';

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
             
             // Persist the intent to stay connected
             localStorage.setItem(CONNECTED_KEY, 'true');
             
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
    tokenClient.requestAccessToken();
  },

  /**
   * Disconnects the session.
   */
  disconnect: () => {
      accessToken = null;
      tokenExpiration = 0;
      localStorage.removeItem(CONNECTED_KEY);
      
      // Revoke token if possible (optional, but good practice)
      if (window.google && accessToken) {
          window.google.accounts.oauth2.revoke(accessToken, () => {
              console.log('Token revoked');
          });
      }
      
      window.dispatchEvent(new Event('drive-token-updated'));
  },

  isAuthenticated: (): boolean => {
    // Check both memory token AND persistence flag. 
    // If flag is true but token missing, we might need to re-auth, but UI treats it as "Enabled"
    const hasFlag = localStorage.getItem(CONNECTED_KEY) === 'true';
    const hasValidToken = !!accessToken && Date.now() < tokenExpiration;
    
    return hasValidToken || hasFlag;
  },

  getAccessToken: (): string | null => {
    if (!!accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }
    return null;
  },

  /**
   * Check if a file exists and is not trashed.
   */
  checkFileStatus: async (fileId: string): Promise<'ok' | 'trashed' | 'missing'> => {
      if (!accessToken) return 'ok'; // Assume OK if we can't check (guest mode or expired)

      try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=trashed,explicitlyTrashed`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (res.status === 404) return 'missing';
          if (!res.ok) return 'ok'; // Unknown error, assume ok to let player try

          const data = await res.json();
          if (data.trashed || data.explicitlyTrashed) return 'trashed';
          return 'ok';
      } catch (e) {
          console.error("Check status failed", e);
          return 'ok';
      }
  },

  /**
   * Renames a project folder (finds it by old name inside App folder).
   */
  renameProjectFolder: async (oldName: string, newName: string): Promise<boolean> => {
      if (!accessToken) return false;

      try {
          const appFolderId = await GoogleDriveService.ensureAppFolder();
          
          // Find the specific project folder
          const query = `mimeType='application/vnd.google-apps.folder' and name='${oldName.replace(/'/g, "\\'")}' and '${appFolderId}' in parents and trashed=false`;
          const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const data = await searchRes.json();

          if (data.files && data.files.length > 0) {
              const folderId = data.files[0].id;
              
              // Rename it
              await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
                  method: 'PATCH',
                  headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ name: newName })
              });
              return true;
          }
          return false;
      } catch (e) {
          console.error("Rename folder failed", e);
          return false;
      }
  },

  /**
   * Helper to find or create a folder inside a parent folder.
   */
  ensureFolder: async (folderName: string, parentId?: string): Promise<string> => {
      if (!accessToken) throw new Error("No access token");

      // Build query
      let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
      if (parentId) {
          query += ` and '${parentId}' in parents`;
      }

      // 1. Search
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await searchRes.json();

      if (data.files && data.files.length > 0) {
          return data.files[0].id;
      }

      // 2. Create
      const metadata: any = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
      };
      if (parentId) {
          metadata.parents = [parentId];
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
      });
      const createData = await createRes.json();
      return createData.id;
  },

  /**
   * Finds the SmoTree.App folder or creates it if it doesn't exist.
   */
  ensureAppFolder: async (): Promise<string> => {
    // If we have flag but no token, try to prompt user or fail
    if (!accessToken) {
        throw new Error("Drive Token Expired. Please reconnect in Profile.");
    }
    return GoogleDriveService.ensureFolder(APP_FOLDER_NAME);
  },

  /**
   * Deletes (trashes) a file from Google Drive.
   */
  deleteFile: async (fileId: string): Promise<void> => {
      if (!accessToken) return; // Fail silently if no token, user can delete manually later
      
      try {
          // We use update to set trashed=true instead of DELETE to avoid permanent data loss accidents
          await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
              method: 'PATCH',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ trashed: true })
          });
      } catch (e) {
          console.error("Failed to delete Drive file", e);
      }
  },

  /**
   * Uploads a file using the Resumable Upload protocol.
   */
  uploadFile: async (file: File, folderId: string, onProgress?: (percent: number) => void, customName?: string): Promise<{ id: string, name: string }> => {
     if (!accessToken) throw new Error("No access token");

     // Step 1: Initiate Resumable Upload Session
     const metadata = {
         name: customName || file.name,
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
                     // Note: "Anyone with link" is safer for simple sharing without complex auth flows for viewers
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
   */
  getVideoStreamUrl: (fileId: string): string => {
      // 1. If we have a token (Owner/Editor), use it.
      if (accessToken) {
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
      }
      
      // 2. Fallback for Guests: Use API Key.
      const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
      if (apiKey) {
         return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      }

      // 3. Last resort fallback
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
};
