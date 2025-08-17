# Guest Chat Testing Plan

This document describes implementation coverage and manual/E2E checks for guest (unauthenticated) chat.

## Implementation Coverage

- **API accepts guests**: `app/api/chat/route.ts` handles sessions via `auth()` and treats missing user as anonymous. Validation continues, and request is processed without redirects.
- **Response annotations**: Assistant messages include `{ type: 'responses', data: { responseId } }` via `buildAssistantMessage()` in `lib/ai/responses/http-helpers.ts`, enabling traceability and previousResponseId chaining.
- **Rate limiting**: IP-based limits enforced in `lib/utils/rate-limit.ts` via `checkAnonymousRateLimit()` using Redis (fail-open if Redis unavailable). Headers returned: `X-RateLimit-*`.
- **Local storage persistence**: Anonymous chat/messages/documents stored under `anonymous-*` keys in `lib/utils/anonymous-chat-storage.ts`. Hooks in `hooks/chat-sync-hooks.ts` (e.g., `useMessagesQuery`, `useSaveMessageMutation`, `useSaveChat`) read/write storage and generate titles asynchronously for the first message.

## Manual Smoke Tests

1. **No Auth Required**
- Navigate to `/` without logging in; verify chat UI loads (no redirects).
- Send a message; ensure `/api/chat` responds without 401/403.

2. **Rate Limiting**
- Send rapid messages; observe `X-RateLimit-...` headers.
- In prod-like config (low per-minute limit), exceeding should yield 429 with error JSON `{ type: 'RATE_LIMIT_EXCEEDED' }` and remaining=0.

3. **Local Storage Persistence**
- After a successful assistant reply, refresh the page. Messages remain visible.
- Inspect `localStorage['anonymous-messages']`, confirm messages for current chat exist and are sorted.
- New chats appear in `localStorage['anonymous-chats']` with title updated from `Untitled` to generated title.

4. **Response Annotations**
- Inspect the last assistant message in `anonymous-messages`. Ensure it contains `annotations` with `{ type: 'responses', data: { responseId } }` and that `responseId` is a non-empty string.

5. **Additional Verification**
- Creating documents as guest stores under `anonymous-documents` and associates with the message id.
- Error handling: invalidate network to `/api/chat` and ensure UI shows a toast and local cache rolls back if needed.

## E2E Coverage

- `tests/guest-chat.e2e.test.ts` validates:
  - UI loads unauthenticated; `/api/chat` accepts POST.
  - Rate-limit headers present; best-effort throttle behavior when limits are small.
  - LocalStorage persistence across reloads.
  - Assistant messages include `responses` annotation with `responseId`.
  - Title generation eventually updates from `Untitled`.

## Notes / Edge Cases

- Redis unavailable: rate limiter fails open; headers synthesized with full remaining.
- Large inputs: server enforces `MAX_INPUT_TOKENS` and returns a structured error.
- Anonymous tools: limited via `ANONYMOUS_LIMITS.AVAILABLE_TOOLS`.
