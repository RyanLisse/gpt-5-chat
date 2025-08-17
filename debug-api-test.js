// Simple Node.js script to test the API
const fetch = require('node-fetch');

async function testAPI() {
  const testMessage = {
    id: 'debug-test-chat',
    message: {
      id: 'debug-test-message',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'Hello, this is a debug test message.',
        },
      ],
      metadata: {
        selectedModel: 'openai/gpt-4o-mini',
        createdAt: new Date().toISOString(),
        parentMessageId: null,
        isPartial: false,
      },
    },
    previousMessages: [],
  };

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const _chunk = decoder.decode(value);
      }
    } else {
      const _errorText = await response.text();
    }
  } catch (_error) {}
}

testAPI();
