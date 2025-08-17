#!/bin/bash

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-chat-123",
    "message": {
      "id": "msg-123",
      "parts": [
        {
          "type": "text",
          "text": "Hello, this is a test message"
        }
      ],
      "metadata": {
        "createdAt": "2025-08-17T22:05:00.000Z",
        "parentMessageId": null,
        "selectedModel": "openai/gpt-4o-mini",
        "selectedTool": null
      },
      "role": "user"
    },
    "previousMessages": []
  }' \
  -v
