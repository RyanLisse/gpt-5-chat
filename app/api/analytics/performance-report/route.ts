import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { budgetMonitor } from '@/lib/performance/budgets';
import { bundleAnalyzer } from '@/lib/performance/bundle-analysis';
import { reportGenerator } from '@/lib/performance/reports';
import { createApiPerformanceMiddleware } from '@/lib/performance/server-monitoring';
import {
  createSuccessResponse,
  handleApiError,
} from '@/lib/utils/api-error-handling';

// Constants for HTTP status codes
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Time window constants
const DEFAULT_TIME_WINDOW = 3_600_000; // 1 hour in milliseconds

const reportRequestSchema = z.object({
  timeWindow: z.number().optional().default(DEFAULT_TIME_WINDOW),
  format: z.enum(['json', 'markdown']).optional().default('json'),
  includeBundleAnalysis: z.boolean().optional().default(false),
});

// Helper function to parse request parameters
function parseReportParams(searchParams: URLSearchParams) {
  return reportRequestSchema.parse({
    timeWindow: searchParams.get('timeWindow')
      ? Number.parseInt(searchParams.get('timeWindow') || '0', 10)
      : undefined,
    format: searchParams.get('format') as 'json' | 'markdown' | undefined,
    includeBundleAnalysis: searchParams.get('includeBundleAnalysis') === 'true',
  });
}

// Helper function to add bundle analysis to report
async function addBundleAnalysisToReport(report: any) {
  try {
    const bundleHistory = await bundleAnalyzer.getAnalysisHistory();
    const latestBundle = bundleHistory.at(-1);

    if (latestBundle) {
      report.bundleAnalysis = {
        latestAnalysis: latestBundle,
        budgetStatus: await bundleAnalyzer.checkBudgets(latestBundle),
        trend:
          bundleHistory.length > 1
            ? await bundleAnalyzer.compareWithPrevious(latestBundle)
            : null,
      };
    }
  } catch (_error) {
    // Bundle analysis is optional, silently continue if it fails
  }
}

// Helper function to create markdown response
function createMarkdownResponse(report: any, perfTracker: any) {
  const markdown = reportGenerator.exportReportAsMarkdown(report);
  const response = new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="performance-report-${new Date().toISOString().split('T')[0]}.md"`,
    },
  });
  perfTracker.end(HTTP_STATUS_OK);
  return response;
}

export async function GET(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(
    request,
    '/api/analytics/performance-report',
  );

  try {
    const { searchParams } = new URL(request.url);
    const params = parseReportParams(searchParams);

    const report = reportGenerator.generateComprehensiveReport(
      params.timeWindow,
    );

    if (params.includeBundleAnalysis) {
      await addBundleAnalysisToReport(report);
    }

    if (params.format === 'markdown') {
      return createMarkdownResponse(report, perfTracker);
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

// Helper function to create tracked response
function createTrackedResponse(
  data: any,
  status: number,
  perfTracker: any,
): NextResponse {
  const response = NextResponse.json(
    data,
    status !== HTTP_STATUS_OK ? { status } : undefined,
  );
  perfTracker.end(status);
  return response;
}

// Helper function to handle bundle analysis action
async function handleBundleAnalysis(perfTracker: any) {
  try {
    const analysis = await bundleAnalyzer.analyzeBuild();
    const budgetResults = await bundleAnalyzer.checkBudgets(analysis);

    return createTrackedResponse(
      {
        success: true,
        analysis,
        budgetResults,
      },
      HTTP_STATUS_OK,
      perfTracker,
    );
  } catch (error) {
    return createTrackedResponse(
      {
        error: 'Bundle analysis failed',
        details: error,
      },
      HTTP_STATUS_INTERNAL_SERVER_ERROR,
      perfTracker,
    );
  }
}

// Helper function to handle budget config update
function handleBudgetConfigUpdate(body: any, perfTracker: any) {
  if (!body.config) {
    return createTrackedResponse(
      {
        error: 'Budget config required',
      },
      HTTP_STATUS_BAD_REQUEST,
      perfTracker,
    );
  }

  budgetMonitor.updateConfig(body.config);
  return createTrackedResponse({ success: true }, HTTP_STATUS_OK, perfTracker);
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
      case 'trigger-bundle-analysis':
        return await handleBundleAnalysis(perfTracker);

      case 'clear-alerts':
        budgetMonitor.clearAlerts();
        return createTrackedResponse(
          { success: true },
          HTTP_STATUS_OK,
          perfTracker,
        );

      case 'update-budget-config':
        return handleBudgetConfigUpdate(body, perfTracker);

      default:
        return createTrackedResponse(
          {
            error: 'Unsupported action',
          },
          HTTP_STATUS_BAD_REQUEST,
          perfTracker,
        );
    }
  } catch (_error) {
    return createTrackedResponse(
      {
        error: 'Internal server error',
      },
      HTTP_STATUS_INTERNAL_SERVER_ERROR,
      perfTracker,
    );
  }
}
