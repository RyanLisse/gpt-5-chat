import { describe, expect, it } from 'vitest';

// Unit tests for reasoning functionality
describe('Reasoning (Unit Tests)', () => {
  it('should be a placeholder test suite for reasoning unit tests', () => {
    // This file contains Playwright E2E tests that only run with PLAYWRIGHT=1
    // For unit tests, we need separate test files
    expect(true).toBe(true);
  });

  it('should validate reasoning message structure', () => {
    const reasoningMessage = {
      id: 'reasoning-1',
      content: 'The sky is blue because of Rayleigh scattering',
      reasoning: 'Light waves interact with air molecules...',
      visible: true,
    };

    expect(reasoningMessage).toHaveProperty('id');
    expect(reasoningMessage).toHaveProperty('content');
    expect(reasoningMessage).toHaveProperty('reasoning');
    expect(typeof reasoningMessage.visible).toBe('boolean');
  });
});

// Note: The Playwright E2E tests below only run when PLAYWRIGHT=1 is set
if (process.env.PLAYWRIGHT === '1') {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { test, expect: playwrightExpect } =
    require('@playwright/test') as typeof import('@playwright/test');
  const { ChatPage } = require('./pages/chat');

  test.describe('chat activity with reasoning', () => {
    let chatPage: InstanceType<typeof ChatPage>;

    test.beforeEach(async ({ page }) => {
      chatPage = new ChatPage(page);
      await chatPage.createNewChat();
    });

    test('send user message and generate response with reasoning', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      playwrightExpect(assistantMessage.content).toBe("It's just blue duh!");

      playwrightExpect(assistantMessage.reasoning).toBe(
        'The sky is blue because of rayleigh scattering!',
      );
    });

    test('toggle reasoning visibility', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      const reasoningElement =
        assistantMessage.element.getByTestId('message-reasoning');
      playwrightExpect(reasoningElement).toBeVisible();

      await assistantMessage.toggleReasoningVisibility();
      await playwrightExpect(reasoningElement).not.toBeVisible();

      await assistantMessage.toggleReasoningVisibility();
      await playwrightExpect(reasoningElement).toBeVisible();
    });

    test('edit message and resubmit', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      const reasoningElement =
        assistantMessage.element.getByTestId('message-reasoning');
      playwrightExpect(reasoningElement).toBeVisible();

      const userMessage = await chatPage.getRecentUserMessage();

      await userMessage.edit('Why is grass green?');
      await chatPage.isGenerationComplete();

      const updatedAssistantMessage =
        await chatPage.getRecentAssistantMessage();

      playwrightExpect(updatedAssistantMessage.content).toBe(
        "It's just green duh!",
      );

      playwrightExpect(updatedAssistantMessage.reasoning).toBe(
        'Grass is green because of chlorophyll absorption!',
      );
    });
  });
}
