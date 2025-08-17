// Debug script to capture and analyze SSE response format
const fetch = require('node-fetch');

async function debugSSEResponse() {
  const testMessage = {
    id: 'debug-sse-chat',
    message: {
      id: 'debug-sse-message',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'Hello! Please respond with a short message for debugging.',
        },
      ],
      metadata: {
        selectedModel: 'openai/gpt-4o-mini',
      },
    },
  };

  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const _errorText = await response.text();
      return;
    }

    // Read the response as text to see raw SSE format
    const responseText = await response.text();
    const lines = responseText.split('\n');
    let _eventCount = 0;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        _eventCount++;
        const data = line.slice(6);

        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'text-delta') {
          } else if (parsed.type === 'data-responseId') {
          } else if (parsed.type?.startsWith('data-')) {
          }
        } catch (_e) {}
      } else if (line.trim()) {
      }
    }
  } catch (_error) {}
}

debugSSEResponse();
