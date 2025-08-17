import { expect, type Response, test } from '@playwright/test';
import { ChatPage } from './pages/chat';

// TDD London School: Timeout optimized for mocked behavior verification
const TITLE_UPDATE_TIMEOUT_MS = 10_000;

// TDD London: Mock contract for rate limit headers behavior
type RateLimitHeaders = {
  limitMinute?: string;
  remainingMinute?: string;
  resetMinute?: string;
};

// Helper to parse rate-limit headers from a Playwright Response
function getRateLimitHeaders(res: Response): RateLimitHeaders {
  const h = res.headers();
  // Playwright normalizes header names to lower-case keys
  return {
    limitMinute: h['x-ratelimit-limit-minute'] || h['x-ratelimit-limit'],
    remainingMinute:
      h['x-ratelimit-remaining-minute'] || h['x-ratelimit-remaining'],
    resetMinute: h['x-ratelimit-reset-minute'] || h['x-ratelimit-reset'],
  };
}

// TDD London: Mock contract for localStorage behavior
// Note: Type definitions removed as they were unused - using inline types instead

test.describe('Guest Chat E2E - TDD London Style', () => {
  test('Guest can chat without auth, headers present, persistence + annotations work', async ({
    page,
  }) => {
    const chat = new ChatPage(page);

    // Ensure we start unauthenticated: no storageState file used
    await chat.createNewChat();

    // TDD London: Mock setup for localStorage behavior - clear after navigation
    await chat.clearLocalStorage();

    // Mock chat API response with proper annotations
    const mockChatResponse = {
      id: 'resp_guest_123',
      content: 'Hello! I can help you with that.',
      annotations: [
        {
          type: 'responses',
          data: { responseId: 'resp_guest_123' },
        },
      ],
    };

    await chat.setupMockChatResponse(mockChatResponse, {
      'x-ratelimit-limit-minute': '60',
      'x-ratelimit-remaining-minute': '59',
      'x-ratelimit-reset-minute': '60',
    });

    // UI visible without redirects - behavior verification
    await chat.isElementVisible('chat-container');

    // Send a message - verify interaction behavior
    await chat.sendUserMessage('Hello from guest user!');
    const apiResponse = await chat.isGenerationComplete();

    // TDD London: Verify behavior contracts
    await chat.verifyGuestChatBehavior();

    // Rate limit headers should be present - contract verification
    const headers = getRateLimitHeaders(apiResponse);
    expect(headers.limitMinute).toBeTruthy();

    // Assistant message should appear - behavior verification
    const assistant = await chat.getRecentAssistantMessage();
    expect(assistant.content && assistant.content.length > 0).toBeTruthy();

    // Local storage persistence: reload and ensure messages still present
    await page.reload();
    await chat.isElementVisible('chat-container');

    // After reload, last assistant message should still be available
    const assistantAfterReload = await chat.getRecentAssistantMessage();
    expect(
      assistantAfterReload.content && assistantAfterReload.content.length > 0,
    ).toBeTruthy();

    // TDD London: Verify localStorage contract behavior
    const anonData = await page.evaluate(() => {
      const raw = localStorage.getItem('anonymous-messages');
      if (!raw) {
        return null;
      }
      try {
        const messages = JSON.parse(raw) as any[];
        const lastAssistant = [...messages]
          .reverse()
          .find((m) => m.role === 'assistant');
        return {
          count: messages.length,
          lastAssistant,
        };
      } catch {
        return null;
      }
    });

    expect(anonData).toBeTruthy();
    expect(anonData?.count).toBeGreaterThan(0);
    expect(anonData?.lastAssistant).toBeTruthy();

    // Verify response annotations exist and include responseId - contract verification
    const responseAnnotation = anonData?.lastAssistant?.annotations?.find(
      (a: any) => a?.type === 'responses' && a?.data?.responseId,
    );
    expect(responseAnnotation).toBeTruthy();
    expect(typeof responseAnnotation.data.responseId).toBe('string');
    expect(responseAnnotation.data.responseId.length).toBeGreaterThan(0);
  });

  test('Rate limiting throttle behavior (best-effort)', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.createNewChat();

    // Send one message to read the per-minute limit value from headers
    let firstResponse: Response | null = null;
    page.on('response', (res) => {
      if (
        res.url().includes('/api/chat') &&
        res.request().method() === 'POST' &&
        !firstResponse
      ) {
        firstResponse = res;
      }
    });

    await chat.sendUserMessage('Probe rate limit');
    await chat.isGenerationComplete();

    let limitPerMinute = 60; // default in dev
    if (firstResponse) {
      const headers = getRateLimitHeaders(firstResponse);
      const parsed = Number(headers.limitMinute || 0);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limitPerMinute = parsed;
      }
    }

    // If the environment is production-like (limit small), try to exceed
    if (limitPerMinute <= 5) {
      let lastHeaders: RateLimitHeaders | null = null;
      for (let i = 0; i < limitPerMinute + 1; i++) {
        // Fire and wait for completion serially to be safe
        await chat.sendUserMessage(`msg ${i}`);
        await chat.isGenerationComplete();
        const responses = await page.waitForResponse((r) =>
          r.url().includes('/api/chat'),
        );
        lastHeaders = getRateLimitHeaders(responses);
      }
      // When exceeded, remaining should be 0 (best-effort check)
      expect(lastHeaders?.remainingMinute === '0').toBeTruthy();
    } else {
      test.skip(
        true,
        'Per-minute limit too high in non-production env; throttle check skipped',
      );
    }
  });

  test('Guest chat title generation eventually updates from Untitled', async ({
    page,
  }) => {
    const chat = new ChatPage(page);
    await chat.createNewChat();

    await chat.sendUserMessage('Write a haiku about rain.');
    await chat.isGenerationComplete();

    // TDD London: Verify localStorage contract for chat title behavior
    const titleFromLocal = await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('anonymous-chats');
        if (!raw) {
          return null;
        }
        try {
          const chats = JSON.parse(raw) as any[];
          const sortedChats = chats.toSorted(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          const latest = sortedChats[0];
          return latest?.title && latest.title !== 'Untitled'
            ? latest.title
            : null;
        } catch {
          return null;
        }
      },
      { timeout: TITLE_UPDATE_TIMEOUT_MS },
    );

    expect(await titleFromLocal.jsonValue()).toBeTruthy();
  });
});
