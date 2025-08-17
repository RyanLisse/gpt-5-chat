import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Simple test response
    return new Response(
      JSON.stringify({
        message: 'Chat API is working! Received your message.',
        receivedData: body,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (_error) {
    return new Response('Error processing chat request', {
      status: 500,
    });
  }
}
