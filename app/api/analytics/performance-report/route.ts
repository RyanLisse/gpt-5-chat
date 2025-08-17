import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { budgetMonitor } from '@/lib/performance/budgets';
import { bundleAnalyzer } from '@/lib/performance/bundle-analysis';
import { reportGenerator } from '@/lib/performance/reports';
import { createApiPerformanceMiddleware } from '@/lib/performance/server-monitoring';
import { handleApiError, createSuccessResponse } from '@/lib/utils/api-error-handling';

const reportRequestSchema = z.object({
  timeWindow: z.number().optional().default(3_600_000), // 1 hour default
  format: z.enum(['json', 'markdown']).optional().default('json'),
  includeBundleAnalysis: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(
    request,
    '/api/analytics/performance-report',
  );

  try {
    const { searchParams } = new URL(request.url);

    const params = reportRequestSchema.parse({
      timeWindow: searchParams.get('timeWindow')
        ? Number.parseInt(searchParams.get('timeWindow') || '0', 10)
        : undefined,
      format: searchParams.get('format') as 'json' | 'markdown' | undefined,
      includeBundleAnalysis:
        searchParams.get('includeBundleAnalysis') === 'true',
    });

    // Generate comprehensive performance report
    const report = reportGenerator.generateComprehensiveReport(
      params.timeWindow,
    );

    // Add bundle analysis if requested
    if (params.includeBundleAnalysis) {
      try {
        const bundleHistory = await bundleAnalyzer.getAnalysisHistory();
        const latestBundle = bundleHistory.at(-1);

        if (latestBundle) {
          (report as any).bundleAnalysis = {
            latestAnalysis: latestBundle,
            budgetStatus: await bundleAnalyzer.checkBudgets(latestBundle),
            trend:
              bundleHistory.length > 1
                ? await bundleAnalyzer.compareWithPrevious(latestBundle)
                : null,
          };
        }
      } catch (_error) {}
    }

    if (params.format === 'markdown') {
      const markdown = reportGenerator.exportReportAsMarkdown(report);

      const response = new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="performance-report-${new Date().toISOString().split('T')[0]}.md"`,
        },
      });

      perfTracker.end(200);
      return response;
    }

    return createSuccessResponse(report, perfTracker);
  } catch (error) {
    return handleApiError({
      error,
      perfTracker,
      fallbackMessage: 'Failed to generate performance report',
    });
  }
}

export async function POST(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(
    request,
    '/api/analytics/performance-report',
  );

  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'trigger-bundle-analysis': {
        try {
          const analysis = await bundleAnalyzer.analyzeBuild();
          const budgetResults = await bundleAnalyzer.checkBudgets(analysis);

          const response = NextResponse.json({
            success: true,
            analysis,
            budgetResults,
          });
          perfTracker.end(200);
          return response;
        } catch (error) {
          const response = NextResponse.json(
            { error: 'Bundle analysis failed', details: error },
            { status: 500 },
          );
          perfTracker.end(500);
          return response;
        }
      }

      case 'clear-alerts': {
        budgetMonitor.clearAlerts();
        const response = NextResponse.json({ success: true });
        perfTracker.end(200);
        return response;
      }

      case 'update-budget-config': {
        if (body.config) {
          budgetMonitor.updateConfig(body.config);
          const response = NextResponse.json({ success: true });
          perfTracker.end(200);
          return response;
        }
        const badRequestResponse = NextResponse.json(
          { error: 'Budget config required' },
          { status: 400 },
        );
        perfTracker.end(400);
        return badRequestResponse;
      }

      default: {
        const unsupportedResponse = NextResponse.json(
          { error: 'Unsupported action' },
          { status: 400 },
        );
        perfTracker.end(400);
        return unsupportedResponse;
      }
    }
  } catch (_error) {
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
    perfTracker.end(500);
    return response;
  }
}
