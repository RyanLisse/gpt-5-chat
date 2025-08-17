import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received chat request:', body);
    
    // Simple test response
    return new Response(JSON.stringify({
      message: 'Chat API is working! Received your message.',
      receivedData: body
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Error processing chat request', {
      status: 500,
    });
  }
}
