# Guest Chat Functionality - Comprehensive Test Plan

## Overview
This document outlines a comprehensive manual smoke test for guest chat functionality, covering all requirements for unauthenticated users including rate limiting, local storage persistence, and response annotations.

## Test Environment
- **URL**: http://localhost:3000
- **Browser**: Chrome/Safari (test in private/incognito mode)
- **Network**: Local development server
- **Storage**: Browser localStorage

## Prerequisites
✅ Development server running on localhost:3000
✅ No authentication required (guest access enabled)
✅ Rate limiting implemented with IP-based throttling
✅ Local storage persistence system active

---

## Test Suite 1: No Authentication Required

### Test 1.1: Access Chat Interface Without Login
**Objective**: Verify users can access chat without authentication

**Steps**:
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000`
3. Verify chat interface loads without login prompts
4. Check for presence of:
   - Chat input area
   - Model selector
   - Send button
   - Chat history sidebar (empty for new user)

**Expected Results**:
- ✅ Chat interface accessible without authentication
- ✅ No login/signup forms or redirects
- ✅ All UI elements functional
- ✅ No error messages about authentication

### Test 1.2: Send First Guest Message
**Objective**: Verify API accepts unauthenticated requests

**Steps**:
1. Type a test message: "Hello, I'm a guest user"
2. Select a model (verify model selector shows full names)
3. Click send button
4. Monitor network requests in browser dev tools

**Expected Results**:
- ✅ Message successfully sent to `/api/chat`
- ✅ No 401/403 authentication errors
- ✅ Response received from AI model
- ✅ Assistant message appears in chat

---

## Test Suite 2: IP-based Rate Limiting

### Test 2.1: Normal Request Flow
**Objective**: Verify rate limiting headers in normal usage

**Steps**:
1. Send a single message as guest user
2. Check response headers in Network tab for:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining` 
   - `X-RateLimit-Reset`

**Expected Results**:
- ✅ Rate limit headers present in response
- ✅ Headers show reasonable limits for guest users
- ✅ No rate limit errors for normal usage

### Test 2.2: Rapid Request Testing
**Objective**: Verify rate limiting triggers appropriately

**Steps**:
1. Rapidly send multiple messages (10+ in quick succession)
2. Monitor for rate limit responses
3. Check for 429 status codes
4. Verify rate limit error messages

**Expected Results**:
- ✅ Rate limiting activates after threshold exceeded
- ✅ 429 status code returned when limited
- ✅ Clear error message about rate limit
- ✅ Rate limit headers show current status

**Note**: Rate limit threshold should be reasonable for testing but prevent abuse

---

## Test Suite 3: Local Storage Chat Persistence

### Test 3.1: Message Persistence After Page Refresh
**Objective**: Verify guest chat messages persist across browser refreshes

**Steps**:
1. Send 3-4 messages as guest user
2. Wait for all responses to complete
3. Refresh the browser page (F5 or Cmd+R)
4. Verify chat history remains intact

**Expected Results**:
- ✅ All previous messages visible after refresh
- ✅ Chat history maintains correct order
- ✅ Both user and assistant messages preserved
- ✅ No data loss during page reload

### Test 3.2: Multiple Chat Sessions
**Objective**: Verify multiple guest chats can be created and persisted

**Steps**:
1. Create first chat with 2-3 messages
2. Start a new chat (use "New Chat" button)
3. Send messages in second chat
4. Navigate between chats using sidebar
5. Refresh browser and verify both chats persist

**Expected Results**:
- ✅ Multiple chat sessions stored independently
- ✅ Can switch between chats without data loss
- ✅ Chat titles auto-generated appropriately
- ✅ All chats persist after browser refresh

### Test 3.3: Local Storage Inspection
**Objective**: Verify proper localStorage structure

**Steps**:
1. Open browser dev tools → Application → Local Storage
2. Check for keys: `anonymous-chats`, `anonymous-messages`, `anonymous-documents`
3. Inspect data structure for correctness
4. Verify session-based user ID isolation

**Expected Results**:
- ✅ Three localStorage keys present with data
- ✅ JSON structure valid and well-formed
- ✅ Messages linked to correct chat IDs
- ✅ User ID consistent across all entries

---

## Test Suite 4: Response Annotations

### Test 4.1: ResponseId in Assistant Messages
**Objective**: Verify all assistant messages include responseId field

**Steps**:
1. Send a message and receive assistant response
2. Open browser dev tools → Network tab
3. Find the `/api/chat` response
4. Inspect response payload for responseId
5. Check both streaming data and final message structure

**Expected Results**:
- ✅ responseId present in assistant message annotations
- ✅ responseId is unique for each AI response
- ✅ responseId properly formatted (UUID or similar)
- ✅ responseId accessible for tracking/debugging

### Test 4.2: ResponseId Uniqueness
**Objective**: Verify each response has unique responseId

**Steps**:
1. Send 3 different messages
2. Collect responseId from each assistant response
3. Verify all responseIds are different
4. Check responseId format consistency

**Expected Results**:
- ✅ Each assistant message has unique responseId
- ✅ ResponseIds follow consistent format
- ✅ No duplicate responseIds across messages
- ✅ ResponseIds trackable across requests

---

## Test Suite 5: Additional Verification

### Test 5.1: Guest Message Saving Functionality
**Objective**: Verify guest messages are properly saved to localStorage

**Steps**:
1. Send various message types (text, with attachments if supported)
2. Check localStorage for message persistence
3. Verify message metadata (timestamps, IDs, etc.)
4. Test message editing/deletion if available

**Expected Results**:
- ✅ All message types saved correctly
- ✅ Metadata properly preserved
- ✅ Message operations work for guest users
- ✅ No data corruption in localStorage

### Test 5.2: Automatic Chat Title Generation
**Objective**: Verify new guest chats get appropriate titles

**Steps**:
1. Start new chat and send first message
2. Check chat title in sidebar
3. Verify title reflects message content
4. Test with different types of first messages

**Expected Results**:
- ✅ Chat titles auto-generated from first message
- ✅ Titles are descriptive and appropriate
- ✅ Title generation works for guest users
- ✅ Titles display correctly in sidebar

### Test 5.3: Error Handling for Failed Requests
**Objective**: Verify proper error handling for network/API failures

**Steps**:
1. Send message while disconnected from internet
2. Send message with invalid model selection
3. Test with malformed requests
4. Verify error messages and recovery

**Expected Results**:
- ✅ Clear error messages for failed requests
- ✅ UI remains stable during errors
- ✅ Users can retry after error resolution
- ✅ No data loss during error conditions

### Test 5.4: UI Seamlessness for Guest Users
**Objective**: Verify chat UI works smoothly for unauthenticated users

**Steps**:
1. Test all UI interactions (typing, sending, scrolling)
2. Verify responsive design on different screen sizes
3. Test keyboard shortcuts and accessibility
4. Check for any authentication-specific UI elements

**Expected Results**:
- ✅ All UI features work identically to authenticated users
- ✅ Responsive design works properly
- ✅ No broken or disabled features for guests
- ✅ Smooth user experience throughout

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Development server running on localhost:3000
- [ ] Browser in private/incognito mode
- [ ] Browser dev tools open (Network and Application tabs)
- [ ] Clear any existing localStorage data

### During Testing
- [ ] Document all test results with screenshots
- [ ] Note any unexpected behaviors or edge cases
- [ ] Record API response times and error rates
- [ ] Verify localStorage data structure after each test

### Post-Test Documentation
- [ ] Summarize all test results
- [ ] List any bugs or issues discovered
- [ ] Document edge cases and recommendations
- [ ] Create improvement suggestions if needed

---

## Success Criteria

All tests must pass with the following criteria:
1. **No Authentication Required**: Guest users can access and use chat without any authentication barriers
2. **Rate Limiting**: IP-based rate limiting works with appropriate headers and error handling
3. **Persistence**: Local storage reliably maintains chat data across sessions
4. **Response Annotations**: All assistant messages include unique, trackable responseIds
5. **Error Handling**: Graceful error handling with clear user feedback
6. **UI Quality**: Seamless user experience equivalent to authenticated users

## Risk Areas & Edge Cases

- **LocalStorage Limits**: Test behavior when localStorage quota exceeded
- **Network Interruptions**: Verify recovery from connection losses
- **Concurrent Requests**: Test multiple simultaneous requests
- **Browser Compatibility**: Test across different browsers
- **Mobile Devices**: Verify functionality on mobile browsers
- **Large Message History**: Test performance with extensive chat history

---

*This test plan ensures comprehensive coverage of guest chat functionality and provides a systematic approach to validation.*