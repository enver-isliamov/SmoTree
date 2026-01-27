
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
             console.log("✅ Google Drive Token Received");
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

      // Auto-connect if user was previously connected
      if (localStorage.getItem(CONNECTED_KEY) === 'true') {
          console.log("🔄 Restoring Drive Session...");
          try {
              // Attempt to get token silently without user interaction
              tokenClient.requestAccessToken({ prompt: 'none' });
          } catch (e) {
              console.warn("Silent token refresh failed", e);
          }
      }

    } else {
      console.warn("Google Identity Services script not loaded.");
    }
  },

  /**
   * Attempts to silently restore the session if user was previously connected.
   */
  restoreSession: () => {
      // Logic moved to init() to ensure it runs as soon as client is ready.
      // This method is kept for manual triggers if needed.
      const shouldBeConnected = localStorage.getItem(CONNECTED_KEY) === 'true';
      if (shouldBeConnected && tokenClient) {
          tokenClient.requestAccessToken({ prompt: 'none' });
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
      
      if (window.google && accessToken) {
          window.google.accounts.oauth2.revoke(accessToken, () => {
              console.log('Token revoked');
          });
      }
      
      window.dispatchEvent(new Event('drive-token-updated'));
  },

  /**
   * Checks if we have a valid access token right now.
   * Used for API calls.
   */
  isAuthenticated: (): boolean => {
    return !!accessToken && Date.now() < tokenExpiration;
  },

  /**
   * Checks if the user intends to be connected (persistent state).
   * Used for UI toggles.
   */
  isConnected: (): boolean => {
      return localStorage.getItem(CONNECTED_KEY) === 'true';
  },

  /**
   * Check if a file exists and is not trashed.
   */
  checkFileStatus: async (fileId: string): Promise<'ok' | 'trashed' | 'missing'> => {
      if (!accessToken) return 'ok'; // Cannot check without token, assume ok to try playing

      try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=trashed,explicitlyTrashed`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (res.status === 404) return 'missing';
          if (!res.ok) {
              return 'ok'; // Fallback on error
          }

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
      if (!accessToken) {
          console.error("Cannot rename: No Access Token");
          return false;
      }

      try {
          const appFolderId = await GoogleDriveService.ensureAppFolder();
          
          // Escape single quotes for the query
          const safeOldName = oldName.replace(/'/g, "\\'");
          
          const query = `mimeType='application/vnd.google-apps.folder' and name='${safeOldName}' and '${appFolderId}' in parents and trashed=false`;
          
          const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const data = await searchRes.json();

          if (data.files && data.files.length > 0) {
              const folderId = data.files[0].id;
              
              const patchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
                  method: 'PATCH',
                  headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ name: newName })
              });
              
              return patchRes.ok;
          }
          return false;
      } catch (e) {
          console.error("Rename folder failed exception", e);
          return false;
      }
  },

  /**
   * Helper to find or create a folder inside a parent folder.
   */
  ensureFolder: async (folderName: string, parentId?: string): Promise<string> => {
      if (!accessToken) throw new Error("No access token");

      const safeName = folderName.replace(/'/g, "\\'");
      let query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false`;
      if (parentId) {
          query += ` and '${parentId}' in parents`;
      }

      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await searchRes.json();

      if (data.files && data.files.length > 0) {
          return data.files[0].id;
      }

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
   * Finds the SmoTree.App folder or creates it.
   */
  ensureAppFolder: async (): Promise<string> => {
    if (!accessToken) {
        throw new Error("Drive Token Expired. Please reconnect in Profile.");
    }
    return GoogleDriveService.ensureFolder(APP_FOLDER_NAME);
  },

  /**
   * Deletes (trashes) a file from Google Drive.
   */
  deleteFile: async (fileId: string): Promise<void> => {
      if (!accessToken) return;
      
      try {
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

     const metadata = {
         name: customName || file.name,
         parents: [folderId]
     };

     const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
         method: 'POST',
         headers: {
             'Authorization': `Bearer ${accessToken}`,
             'Content-Type': 'application/json',
             'X-Upload-Content-Type': file.type || 'application/octet-stream',
             'X-Upload-Content-Length': file.size.toString()
         },
         body: JSON.stringify(metadata)
     });

     if (!initResponse.ok) {
         throw new Error(`Drive Init Failed: ${initResponse.status}`);
     }

     const sessionUri = initResponse.headers.get('Location');
     if (!sessionUri) throw new Error("No session URI");

     return new Promise((resolve, reject) => {
         const xhr = new XMLHttpRequest();
         xhr.open('PUT', sessionUri);
         
         if (onProgress) {
             xhr.upload.onprogress = (e) => {
                 if (e.lengthComputable) {
                     onProgress(Math.round((e.loaded / e.total) * 100));
                 }
             };
         }

         xhr.onload = async () => {
             if (xhr.status === 200 || xhr.status === 201) {
                 try {
                     const response = JSON.parse(xhr.responseText);
                     
                     // Make public for guests (optional, but good for sharing)
                     try {
                        await fetch(`https://www.googleapis.com/drive/v3/files/${response.id}/permissions`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ role: 'reader', type: 'anyone' })
                        });
                     } catch (e) {}

                     resolve(response);
                 } catch (e) {
                     reject(new Error("Invalid JSON"));
                 }
             } else {
                 reject(new Error(`Upload failed: ${xhr.status}`));
             }
         };
         xhr.onerror = () => reject(new Error("Network error"));
         xhr.send(file);
     });
  },

  /**
   * Returns a streaming URL for the file.
   * CRITICAL: Uses access_token query param for direct streaming if authenticated.
   */
  getVideoStreamUrl: (fileId: string): string => {
      // 1. If we have a token (Owner/Editor), use it directly in URL.
      // This is crucial for HTML5 video tag to work without CORS headers issues
      if (accessToken && Date.now() < tokenExpiration) {
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
      }
      
      // 2. Fallback for Guests or if token expired: Use API Key (Requires file to be public/shared with API key service account if not public)
      // Note: Video tag often fails with simple API key due to CORS if not set up perfectly.
      // The best fallback for guests is the "uc" (User Content) export link, though it might hit limits.
      const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
      if (apiKey) {
         return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      }

      // 3. Last resort fallback
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
};
