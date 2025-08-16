'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import {
  clearAnonymousSession,
  createAnonymousSession,
  getAnonymousSession,
  setAnonymousSession,
} from '@/lib/anonymous-session-client';
import type { AnonymousSession } from '@/lib/types/anonymous';

// Schema validation function
function isValidAnonymousSession(obj: any): obj is AnonymousSession {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    (obj.createdAt instanceof Date || typeof obj.createdAt === 'string')
  );
}

export function AnonymousSessionInit() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only initialize for non-authenticated users after session is loaded
    if (status === 'loading') {
      return;
    }
    if (session?.user) {
      return;
    }

    // Get raw session data and validate/migrate
    const existingSession = getAnonymousSession();

    if (existingSession) {
      // Validate the existing session schema
      if (!isValidAnonymousSession(existingSession)) {
        clearAnonymousSession();
        const newSession = createAnonymousSession();
        setAnonymousSession(newSession);
        return;
      }
    } else {
      const newSession = createAnonymousSession();
      setAnonymousSession(newSession);
    }
  }, [session, status]);

  return null; // This component doesn't render anything
}
