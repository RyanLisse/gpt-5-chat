#!/usr/bin/env node

const fetch = require('node-fetch');

async function testChatAPI() {
  const url = 'http://localhost:3000/api/chat';

  const testMessage = {
    id: 'test-chat-' + Date.now(),
    message: {
      id: 'msg-' + Date.now(),
      parts: [
        {
          type: 'text',
          text: 'Hello, this is a test message',
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-4o-mini',
        selectedTool: undefined,
      },
      role: 'user',
    },
    previousMessages: [],
  };

  try {
    console.log('Testing chat API endpoint...');
    console.log('Request payload:', JSON.stringify(testMessage, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    console.log('Response status:', response.status);
    console.log(
      'Response headers:',
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      console.error('Response status:', response.status);
      console.error('Response statusText:', response.statusText);
      return;
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Streaming response:');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('Chunk:', chunk);
    }

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testChatAPI();
