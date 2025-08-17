'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect, useRef } from 'react';
import { budgetMonitor } from '@/lib/performance/budgets';
import {
  checkPerformanceBudget,
  type PerformanceData,
  WebVitalsReporter,
} from '@/lib/performance/web-vitals';

type WebVitalsTrackerProps = {
  userId?: string;
  debug?: boolean;
};

export function WebVitalsTracker({
  userId,
  debug = false,
}: WebVitalsTrackerProps) {
  const reporterRef = useRef<WebVitalsReporter | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleReport = async (data: PerformanceData) => {
      if (debug) {
      }

      // Check performance budget
      const budgetCheck = checkPerformanceBudget(data);
      if (!budgetCheck.passed && debug) {
      }

      // Check budget monitor for alerts
      const alert = budgetMonitor.checkBudget(data);
      if (alert && debug) {
      }

      // Store in localStorage for dashboard
      try {
        const stored = localStorage.getItem('webVitalsData');
        const existing = stored ? JSON.parse(stored) : [];
        const updated = [...existing, data].slice(-100); // Keep last 100 entries
        localStorage.setItem('webVitalsData', JSON.stringify(updated));
      } catch (_error) {
        if (debug) {
        }
      }

      // Send to analytics endpoint
      try {
        await fetch('/api/analytics/web-vitals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      } catch (_error) {
        if (debug) {
        }
      }
    };

    // Initialize reporter
    reporterRef.current = new WebVitalsReporter(handleReport, userId);
    reporterRef.current.startTracking();

    // Track page navigation for SPA
    const handleNavigation = () => {
      // Re-initialize tracking for new page
      if (reporterRef.current) {
        reporterRef.current.startTracking();
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleNavigation);

    // For Next.js app router navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      originalPushState.apply(window.history, args);
      handleNavigation();
    };

    window.history.replaceState = (...args) => {
      originalReplaceState.apply(window.history, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [userId, debug]);

  useEffect(() => {
    // Update user ID when it changes
    if (reporterRef.current && userId) {
      reporterRef.current.updateUserId(userId);
    }
  }, [userId]);

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default WebVitalsTracker;
