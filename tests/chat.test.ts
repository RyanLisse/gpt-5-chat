import { describe, expect, it } from 'vitest';

// Unit tests for chat functionality
describe('Chat (Unit Tests)', () => {
  it('should be a placeholder test suite for chat unit tests', () => {
    // This file contains Playwright E2E tests that only run with PLAYWRIGHT=1
    // For unit tests, we need separate test files
    expect(true).toBe(true);
  });

  it('should validate chat message structure', () => {
    const chatMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello world',
      timestamp: new Date().toISOString(),
    };

    expect(chatMessage).toHaveProperty('id');
    expect(chatMessage).toHaveProperty('role');
    expect(chatMessage).toHaveProperty('content');
    expect(['user', 'assistant', 'system']).toContain(chatMessage.role);
  });
});

// Note: The Playwright E2E tests below only run when PLAYWRIGHT=1 is set
// Only define Playwright e2e tests when explicitly enabled.
// Prevents Bun/Vitest from importing Playwright and failing unit test runs.
if (process.env.PLAYWRIGHT === '1') {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { test, expect } =
    require('@playwright/test') as typeof import('@playwright/test');
  const { ChatPage } = require('./pages/chat');

  test.describe('chat activity', () => {
    let chatPage: InstanceType<typeof ChatPage>;

    test.beforeEach(async ({ page }) => {
      chatPage = new ChatPage(page);
      await chatPage.createNewChat();
    });

    test('send a user message and receive response', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain("It's just green duh!");
    });

    test('redirect to /chat/:id after submitting message', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain("It's just green duh!");
      await chatPage.hasChatIdInUrl();
    });

    test('send a user message from suggestion', async () => {
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain(
        'With Next.js, you can ship fast!',
      );
    });

    test('toggle between send/stop button based on activity', async () => {
      await expect(chatPage.sendButton).toBeVisible();
      await expect(chatPage.sendButton).toBeDisabled();

      await chatPage.sendUserMessage('Why is grass green?');

      await expect(chatPage.sendButton).not.toBeVisible();
      await expect(chatPage.stopButton).toBeVisible();

      await chatPage.isGenerationComplete();

      await expect(chatPage.stopButton).not.toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
    });

    test('stop generation during submission', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await expect(chatPage.stopButton).toBeVisible();
      await chatPage.stopButton.click();
      await expect(chatPage.sendButton).toBeVisible();
    });

    test('edit user message and resubmit', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain("It's just green duh!");

      const userMessage = await chatPage.getRecentUserMessage();
      await userMessage.edit('Why is the sky blue?');

      await chatPage.isGenerationComplete();

      const updatedAssistantMessage =
        await chatPage.getRecentAssistantMessage();
      expect(updatedAssistantMessage.content).toContain("It's just blue duh!");
    });

    test('hide suggested actions after sending message', async () => {
      await chatPage.isElementVisible('suggested-actions');
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.isElementNotVisible('suggested-actions');
    });

    test('upload file and send image attachment with message', async () => {
      await chatPage.addImageAttachment();

      await chatPage.isElementVisible('attachments-preview');
      await chatPage.isElementVisible('input-attachment-loader');
      await chatPage.isElementNotVisible('input-attachment-loader');

      await chatPage.sendUserMessage('Who painted this?');

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.attachments).toHaveLength(1);

      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toBe('This painting is by Monet!');
    });

    test('call weather tool', async () => {
      await chatPage.sendUserMessage("What's the weather in sf?");
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();

      expect(assistantMessage.content).toBe(
        'The current temperature in San Francisco is 17°C.',
      );
    });

    test('upvote message', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.upvote();
      await chatPage.isVoteComplete();
    });

    test('downvote message', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.downvote();
      await chatPage.isVoteComplete();
    });

    test('update vote', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.upvote();
      await chatPage.isVoteComplete();

      await assistantMessage.downvote();
      await chatPage.isVoteComplete();
    });
  });
}
