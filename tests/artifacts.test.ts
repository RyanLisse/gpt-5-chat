// @ts-nocheck
if (process.env.PLAYWRIGHT === '1') {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { expect, test } =
    require('@playwright/test') as typeof import('@playwright/test');
  const { ChatPage } = require('./pages/chat');
  const { ArtifactPage } = require('./pages/artifact');

  test.describe('artifacts activity', () => {
    let chatPage;
    let artifactPage;

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

      expect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toBe(
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

      expect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toBe(
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

      expect(artifactPage.artifact).toBeVisible();

      const assistantMessage = await artifactPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toBe(
        'A document was created and is now visible to the user.',
      );

      await artifactPage.sendUserMessage('Thanks!');
      await artifactPage.isGenerationComplete();

      const secondAssistantMessage = await chatPage.getRecentAssistantMessage();
      expect(secondAssistantMessage.content).toBe("You're welcome!");
    });
  });
}
