import { handleUpload } from '@vercel/blob/client';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const body = await request.json();
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate user here if needed
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
          tokenPayload: JSON.stringify({
            // optional payload
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Callback after upload
        // console.log('Upload complete:', blob.url);
      },
    });

    return new Response(JSON.stringify(jsonResponse), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}