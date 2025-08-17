import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiPerformanceMiddleware } from '@/lib/performance/server-monitoring';
import {
  createSuccessResponse,
  handleApiError,
} from '@/lib/utils/api-error-handling';

// Base time unit constants
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const MILLISECONDS_PER_SECOND = 1000;

// Time window constants in milliseconds
const TIME_WINDOWS = {
  ONE_HOUR: SECONDS_PER_MINUTE * MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND,
  ONE_DAY:
    HOURS_PER_DAY *
    SECONDS_PER_MINUTE *
    MINUTES_PER_HOUR *
    MILLISECONDS_PER_SECOND,
  ONE_WEEK:
    DAYS_PER_WEEK *
    HOURS_PER_DAY *
    SECONDS_PER_MINUTE *
    MINUTES_PER_HOUR *
    MILLISECONDS_PER_SECOND,
  ONE_MONTH:
    DAYS_PER_MONTH *
    HOURS_PER_DAY *
    SECONDS_PER_MINUTE *
    MINUTES_PER_HOUR *
    MILLISECONDS_PER_SECOND,
} as const;

const webVitalSchema = z.object({
  name: z.enum(['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP']),
  value: z.number(),
  delta: z.number(),
  id: z.string(),
  url: z.string(),
  userAgent: z.string(),
  timestamp: z.number(),
  sessionId: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(request, '/api/analytics/web-vitals');

  try {
    const body = await request.json();
    const _validatedData = webVitalSchema.parse(body);

    // You could send to external analytics services here
    // await sendToAnalyticsService(validatedData);

    // Store in database if you have web vitals table
    // await storeWebVitalsData(validatedData);

    return createSuccessResponse({ success: true }, perfTracker);
  } catch (error) {
    return handleApiError({
      error,
      perfTracker,
      fallbackMessage: 'Internal server error',
    });
  }
}

// Helper function to calculate time window
function calculateTimeWindow(timeRange: string) {
  const timeWindows = {
    '1h': TIME_WINDOWS.ONE_HOUR,
    '24h': TIME_WINDOWS.ONE_DAY,
    '7d': TIME_WINDOWS.ONE_WEEK,
    '30d': TIME_WINDOWS.ONE_MONTH,
  };

  const windowMs =
    timeWindows[timeRange as keyof typeof timeWindows] || timeWindows['24h'];
  return Date.now() - windowMs;
}

// Helper function to generate mock metrics data
function generateMockMetrics() {
  return {
    LCP: {
      value: 2100,
      rating: 'good',
      trend: 'improving',
      samples: 45,
    },
    FID: {
      value: 85,
      rating: 'good',
      trend: 'stable',
      samples: 32,
    },
    INP: {
      value: 180,
      rating: 'good',
      trend: 'improving',
      samples: 38,
    },
    CLS: {
      value: 0.08,
      rating: 'good',
      trend: 'stable',
      samples: 42,
    },
    FCP: {
      value: 1650,
      rating: 'good',
      trend: 'improving',
      samples: 41,
    },
    TTFB: {
      value: 720,
      rating: 'good',
      trend: 'stable',
      samples: 44,
    },
  };
}

// Helper function to generate mock pages data
function generateMockPages() {
  return [
    {
      url: '/',
      pageviews: 120,
      avgLCP: 2050,
      avgFID: 82,
      avgCLS: 0.07,
    },
    {
      url: '/chat',
      pageviews: 85,
      avgLCP: 2200,
      avgFID: 90,
      avgCLS: 0.09,
    },
  ];
}

// GET endpoint to retrieve Web Vitals data for dashboard
export function GET(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(request, '/api/analytics/web-vitals');

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const since = calculateTimeWindow(timeRange);

    // Here you would fetch from your database
    // const data = await fetchWebVitalsData({ since, userId });

    const mockData = {
      timeRange: {
        start: since,
        end: Date.now(),
        window: timeRange,
      },
      metrics: generateMockMetrics(),
      pages: generateMockPages(),
    };

    return createSuccessResponse(mockData, perfTracker);
  } catch (error) {
    return handleApiError({
      error,
      perfTracker,
      fallbackMessage: 'Internal server error',
    });
  }
}
