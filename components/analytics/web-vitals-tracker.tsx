'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useWebVitalsTracking } from './web-vitals/use-web-vitals-tracking';

type WebVitalsTrackerProps = {
  userId?: string;
  debug?: boolean;
};

export function WebVitalsTracker({
  userId,
  debug = false,
}: WebVitalsTrackerProps) {
  useWebVitalsTracking({ userId, debug });

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default WebVitalsTracker;
