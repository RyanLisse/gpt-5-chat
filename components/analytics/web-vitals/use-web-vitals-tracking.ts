import { useCallback, useEffect, useRef } from 'react';
import {
  type PerformanceData,
  WebVitalsReporter,
} from '@/lib/performance/web-vitals';
import { PerformanceReportHandler } from './performance-report-handler';
import { useNavigationTracking } from './use-navigation-tracking';

export type UseWebVitalsTrackingOptions = {
  userId?: string;
  debug?: boolean;
};

export const useWebVitalsTracking = (
  options: UseWebVitalsTrackingOptions = {},
) => {
  const { userId, debug = false } = options;
  const reporterRef = useRef<WebVitalsReporter | null>(null);
  const reportHandlerRef = useRef<PerformanceReportHandler | null>(null);

  // Initialize report handler
  useEffect(() => {
    reportHandlerRef.current = new PerformanceReportHandler({ debug });
  }, [debug]);

  // Handle report submission
  const handleReport = useCallback(async (data: PerformanceData) => {
    if (reportHandlerRef.current) {
      await reportHandlerRef.current.handleReport(data);
    }
  }, []);

  // Handle navigation for re-tracking
  const handleNavigation = useCallback(() => {
    if (reporterRef.current) {
      reporterRef.current.startTracking();
    }
  }, []);

  // Set up navigation tracking
  useNavigationTracking(handleNavigation);

  // Initialize web vitals reporter
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize reporter
    reporterRef.current = new WebVitalsReporter(handleReport, userId);
    reporterRef.current.startTracking();
  }, [handleReport, userId]);

  // Update user ID when it changes
  useEffect(() => {
    if (reporterRef.current && userId) {
      reporterRef.current.updateUserId(userId);
    }
  }, [userId]);
};
