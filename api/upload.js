
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Server configuration error: Missing Blob Token" });
  }

  const body = req.body;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // 1. Parse Payload
        let payload;
        try {
            payload = clientPayload ? JSON.parse(clientPayload) : {};
        } catch (e) {
            throw new Error("Invalid payload");
        }

        // 2. Validate Google Token
        if (!payload.token) {
            throw new Error("Unauthorized: Missing Auth Token");
        }

        try {
            const googleCheck = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${payload.token}`);
            if (!googleCheck.ok) {
                throw new Error("Unauthorized: Invalid Google Token");
            }
        } catch (e) {
             throw new Error("Unauthorized: Token validation failed");
        }

        // 3. Allow Upload
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
          tokenPayload: JSON.stringify({
             user: payload.user || 'anonymous'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: Log upload success
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
