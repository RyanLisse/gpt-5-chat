import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export type WebVitalMetric = 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

export interface PerformanceData extends Metric {
  url: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export type PerformanceBudget = {
  metric: WebVitalMetric;
  budget: number;
  label: string;
  description: string;
};

// Performance budgets based on Core Web Vitals thresholds
export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  {
    metric: 'LCP',
    budget: 2500, // 2.5s
    label: 'Largest Contentful Paint',
    description: 'Time until largest content element is rendered',
  },
  {
    metric: 'INP',
    budget: 200, // 200ms
    label: 'Interaction to Next Paint',
    description: 'Time from user interaction to next paint',
  },
  {
    metric: 'CLS',
    budget: 0.1, // 0.1
    label: 'Cumulative Layout Shift',
    description: 'Visual stability metric',
  },
  {
    metric: 'FCP',
    budget: 1800, // 1.8s
    label: 'First Contentful Paint',
    description: 'Time until first content is painted',
  },
  {
    metric: 'TTFB',
    budget: 800, // 800ms
    label: 'Time to First Byte',
    description: 'Time until first byte is received',
  },
];

export class WebVitalsReporter {
  private readonly sessionId: string;
  private userId?: string;
  private readonly onReport: (data: PerformanceData) => void;

  constructor(onReport: (data: PerformanceData) => void, userId?: string) {
    this.sessionId = this.generateSessionId();
    this.userId = userId;
    this.onReport = onReport;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private createPerformanceData(metric: Metric): PerformanceData {
    return {
      ...metric,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };
  }

  public startTracking(): void {
    // Track Core Web Vitals
    onCLS((metric: Metric) => {
      this.onReport(this.createPerformanceData(metric));
    });

    onINP((metric: Metric) => {
      this.onReport(this.createPerformanceData(metric));
    });

    onLCP((metric: Metric) => {
      this.onReport(this.createPerformanceData(metric));
    });

    onFCP((metric: Metric) => {
      this.onReport(this.createPerformanceData(metric));
    });

    onTTFB((metric: Metric) => {
      this.onReport(this.createPerformanceData(metric));
    });
  }

  public updateUserId(userId: string): void {
    this.userId = userId;
  }
}

export function checkPerformanceBudget(metric: PerformanceData): {
  passed: boolean;
  budget: PerformanceBudget | null;
  exceedsBy?: number;
} {
  const budget = PERFORMANCE_BUDGETS.find((b) => b.metric === metric.name);

  if (!budget) {
    return { passed: true, budget: null };
  }

  const passed = metric.value <= budget.budget;
  const exceedsBy = passed ? undefined : metric.value - budget.budget;

  return { passed, budget, exceedsBy };
}

export function getPerformanceRating(
  metric: WebVitalMetric,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[metric];
  if (value <= threshold.good) {
    return 'good';
  }
  if (value <= threshold.poor) {
    return 'needs-improvement';
  }
  return 'poor';
}

export function formatMetricValue(
  metric: WebVitalMetric,
  value: number,
): string {
  if (metric === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}
