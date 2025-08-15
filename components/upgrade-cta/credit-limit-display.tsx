'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useGetCredits } from '@/hooks/chat-sync-hooks';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

type CreditLimitDisplayProps = {
  className?: string;
};

export function CreditLimitDisplay({ className }: CreditLimitDisplayProps) {
  const { credits, isLoadingCredits } = useGetCredits();
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const [dismissed, setDismissed] = useState(false);

  // Don't show for authenticated users
  if (isAuthenticated) {
    return null;
  }

  if (isLoadingCredits) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  const remaining = credits ?? 0;

  // Only show when approaching or at limit
  const isAtLimit = remaining <= 0;

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, height: 'auto' }}
        className={cn('w-full', className)}
        exit={{ opacity: 0, height: 0 }}
        initial={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm',
            isAtLimit
              ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
          )}
        >
          <div className="flex-1">
            {isAtLimit ? (
              <span>
                You&apos;ve reached your credit limit.{' '}
                <Link
                  className="font-medium text-red-700 underline hover:no-underline dark:text-red-300"
                  href="/login"
                >
                  Sign in to reset your limits
                </Link>
              </span>
            ) : (
              <span>
                You only have{' '}
                <strong>
                  {remaining} credit{remaining !== 1 ? 's' : ''}
                </strong>{' '}
                left.{' '}
                <Link
                  className="font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
                  href="/login"
                >
                  Sign in to reset your limits
                </Link>
              </span>
            )}
          </div>
          <Button
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={() => setDismissed(true)}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
