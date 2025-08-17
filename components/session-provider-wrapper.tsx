'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

type SessionProviderWrapperProps = {
  children: React.ReactNode;
  session: Session | null;
};

export function SessionProviderWrapper({
  children,
  session,
}: SessionProviderWrapperProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
