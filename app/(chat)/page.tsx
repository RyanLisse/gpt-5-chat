import { DeferredChatPage } from './chat/[id]/deferred-chat-page';

// Opt out of static prerendering to avoid build-time errors when client-side
// logic may call notFound() based on router state.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return <DeferredChatPage />;
}
