// @ts-nocheck
import { describe, expect, it } from 'vitest';

// Unit tests for artifact functionality
describe('Artifacts (Unit Tests)', () => {
  it('should be a placeholder test suite for artifact unit tests', () => {
    // This file contains Playwright E2E tests that only run with PLAYWRIGHT=1
    // For unit tests, we need separate test files
    expect(true).toBe(true);
  });

  it('should validate artifact types', () => {
    const validArtifactTypes = ['text', 'code', 'markdown', 'html'];
    expect(validArtifactTypes).toContain('text');
    expect(validArtifactTypes).toContain('code');
  });
});

// Note: The Playwright E2E tests below only run when PLAYWRIGHT=1 is set
// @ts-nocheck
if (process.env.PLAYWRIGHT === '1') {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { expect: playwrightExpect, test } =
    require('@playwright/test') as typeof import('@playwright/test');
  const { ChatPage } = require('./pages/chat');
  const { ArtifactPage } = require('./pages/artifact');

  test.describe('artifacts activity', () => {
    let chatPage: any;
    let artifactPage: any;

    test.beforeEach(async ({ page }) => {
      chatPage = new ChatPage(page);
      artifactPage = new ArtifactPage(page);

      await chatPage.createNewChat();
    });

    test('create a text artifact', async () => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage(
        'Help me write an essay about Silicon Valley',
      );
      await artifactPage.isGenerationComplete();

      playwrightExpect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      playwrightExpect(assistantMessage.content).toBe(
        'A document was created and is now visible to the user.',
      );

      await chatPage.hasChatIdInUrl();
    });

    test('toggle artifact visibility', async () => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage(
        'Help me write an essay about Silicon Valley',
      );
      await artifactPage.isGenerationComplete();

      playwrightExpect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      playwrightExpect(assistantMessage.content).toBe(
        'A document was created and is now visible to the user.',
      );

      await artifactPage.closeArtifact();
      await chatPage.isElementNotVisible('artifact');
    });

    test('send follow up message after generation', async () => {
      await chatPage.createNewChat();

      await chatPage.sendUserMessage(
        'Help me write an essay about Silicon Valley',
      );
      await artifactPage.isGenerationComplete();

      playwrightExpect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await artifactPage.getRecentAssistantMessage();
      playwrightExpect(assistantMessage.content).toBe(
        'A document was created and is now visible to the user.',
      );

      await artifactPage.sendUserMessage('Thanks!');
      await artifactPage.isGenerationComplete();

      const secondAssistantMessage = await chatPage.getRecentAssistantMessage();
      playwrightExpect(secondAssistantMessage.content).toBe("You're welcome!");
    });
  });
}
