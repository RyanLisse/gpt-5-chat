import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiPerformanceMiddleware } from '@/lib/performance/server-monitoring';

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

    const response = NextResponse.json({ success: true });
    perfTracker.end(200);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 },
      );
      perfTracker.end(400);
      return response;
    }

    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
    perfTracker.end(500);
    return response;
  }
}

// GET endpoint to retrieve Web Vitals data for dashboard
export async function GET(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(request, '/api/analytics/web-vitals');

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    // Calculate time window
    const timeWindows = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const windowMs =
      timeWindows[timeRange as keyof typeof timeWindows] || timeWindows['24h'];
    const since = Date.now() - windowMs;

    // Here you would fetch from your database
    // const data = await fetchWebVitalsData({ since, userId });

    // For now, return mock data structure
    const mockData = {
      timeRange: {
        start: since,
        end: Date.now(),
        window: timeRange,
      },
      metrics: {
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
      },
      pages: [
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
      ],
    };

    const response = NextResponse.json(mockData);
    perfTracker.end(200);
    return response;
  } catch (_error) {
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
    perfTracker.end(500);
    return response;
  }
}
