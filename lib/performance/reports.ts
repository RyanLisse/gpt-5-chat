import { budgetMonitor, type PerformanceAlert } from './budgets';
import {
  generatePerformanceReport,
  type PerformanceReport,
} from './server-monitoring';
import {
  formatMetricValue,
  getPerformanceRating,
  type WebVitalMetric,
} from './web-vitals';

export type PerformanceInsight = {
  type: 'improvement' | 'regression' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: WebVitalMetric;
  actionable: boolean;
  recommendation?: string;
};

export type ComprehensivePerformanceReport = {
  id: string;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  summary: {
    overallScore: number;
    coreWebVitalsPass: boolean;
    totalAlerts: number;
    criticalIssues: number;
  };
  metrics: {
    coreWebVitals: Record<
      WebVitalMetric,
      {
        value: number;
        rating: 'good' | 'needs-improvement' | 'poor';
        trend: 'improving' | 'stable' | 'degrading';
        percentileP75: number;
        percentileP95: number;
      }
    >;
    server: PerformanceReport;
  };
  insights: PerformanceInsight[];
  alerts: PerformanceAlert[];
  recommendations: string[];
};

export class PerformanceReportGenerator {
  generateInsights(
    currentMetrics: Record<WebVitalMetric, number>,
    previousMetrics?: Record<WebVitalMetric, number>,
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    insights.push(...this.generateCoreVitalsInsights(currentMetrics));

    if (previousMetrics) {
      insights.push(
        ...this.generateComparisonInsights(currentMetrics, previousMetrics),
      );
    }

    insights.push(...this.generateMetricSpecificInsights(currentMetrics));

    return insights;
  }

  private generateCoreVitalsInsights(
    currentMetrics: Record<WebVitalMetric, number>,
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const coreVitals: WebVitalMetric[] = ['LCP', 'INP', 'CLS'];
    const passingVitals = coreVitals.filter(
      (metric) =>
        getPerformanceRating(metric, currentMetrics[metric]) === 'good',
    );

    if (passingVitals.length === coreVitals.length) {
      insights.push({
        type: 'achievement',
        title: 'Core Web Vitals Passing',
        description: 'All Core Web Vitals metrics are in the "good" range',
        impact: 'high',
        actionable: false,
      });
    } else {
      const failingVitals = coreVitals.filter(
        (metric) =>
          getPerformanceRating(metric, currentMetrics[metric]) !== 'good',
      );

      insights.push({
        type: 'regression',
        title: 'Core Web Vitals Issues',
        description: `${failingVitals.length} Core Web Vitals metric(s) need improvement: ${failingVitals.join(', ')}`,
        impact: 'high',
        actionable: true,
        recommendation:
          'Focus on optimizing the failing Core Web Vitals metrics to improve user experience',
      });
    }

    return insights;
  }

  private generateComparisonInsights(
    currentMetrics: Record<WebVitalMetric, number>,
    previousMetrics: Record<WebVitalMetric, number>,
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    for (const [metric, currentValue] of Object.entries(currentMetrics)) {
      const metricName = metric as WebVitalMetric;
      const previousValue = previousMetrics[metricName];

      if (previousValue && currentValue !== previousValue) {
        const improvement = previousValue - currentValue;
        const improvementPercent = (improvement / previousValue) * 100;

        if (Math.abs(improvementPercent) > 5) {
          // Only report significant changes
          if (improvement > 0) {
            insights.push({
              type: 'improvement',
              title: `${metricName} Improved`,
              description: `${metricName} improved by ${formatMetricValue(metricName, improvement)} (${improvementPercent.toFixed(1)}%)`,
              impact: this.getImpactLevel(improvementPercent),
              metric: metricName,
              actionable: false,
            });
          } else {
            insights.push({
              type: 'regression',
              title: `${metricName} Regressed`,
              description: `${metricName} regressed by ${formatMetricValue(metricName, -improvement)} (${(-improvementPercent).toFixed(1)}%)`,
              impact: this.getImpactLevel(-improvementPercent),
              metric: metricName,
              actionable: true,
              recommendation: this.getMetricRecommendation(metricName),
            });
          }
        }
      }
    }

    return insights;
  }

  private generateMetricSpecificInsights(
    metrics: Record<WebVitalMetric, number>,
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // LCP specific insights
    if (getPerformanceRating('LCP', metrics.LCP) !== 'good') {
      insights.push({
        type: 'recommendation',
        title: 'Optimize Largest Contentful Paint',
        description: `LCP is ${formatMetricValue('LCP', metrics.LCP)}, which is above the recommended 2.5s threshold`,
        impact: 'high',
        metric: 'LCP',
        actionable: true,
        recommendation:
          'Consider optimizing images, using CDN, preloading critical resources, or server-side rendering',
      });
    }

    // INP specific insights
    if (getPerformanceRating('INP', metrics.INP) !== 'good') {
      insights.push({
        type: 'recommendation',
        title: 'Improve Input Responsiveness',
        description: `INP is ${formatMetricValue('INP', metrics.INP)}, indicating delayed user interaction responses`,
        impact: 'high',
        metric: 'INP',
        actionable: true,
        recommendation:
          'Optimize JavaScript execution, split long tasks, use web workers for heavy computations',
      });
    }

    // CLS specific insights
    if (getPerformanceRating('CLS', metrics.CLS) !== 'good') {
      insights.push({
        type: 'recommendation',
        title: 'Reduce Layout Shifts',
        description: `CLS is ${formatMetricValue('CLS', metrics.CLS)}, indicating visual instability`,
        impact: 'medium',
        metric: 'CLS',
        actionable: true,
        recommendation:
          'Set dimensions for images/videos, avoid inserting content above existing content, use CSS transforms',
      });
    }

    // TTFB specific insights
    if (metrics.TTFB > 800) {
      insights.push({
        type: 'recommendation',
        title: 'Optimize Server Response Time',
        description: `TTFB is ${formatMetricValue('TTFB', metrics.TTFB)}, which may indicate server performance issues`,
        impact: 'medium',
        metric: 'TTFB',
        actionable: true,
        recommendation:
          'Optimize database queries, use caching, upgrade server resources, or use a CDN',
      });
    }

    return insights;
  }

  private getImpactLevel(percent: number): 'high' | 'medium' | 'low' {
    if (percent > 15) {
      return 'high';
    }
    if (percent > 5) {
      return 'medium';
    }
    return 'low';
  }

  private getMetricRecommendation(metric: WebVitalMetric): string {
    const recommendations = {
      LCP: 'Optimize images, use CDN, preload critical resources, implement server-side rendering',
      INP: 'Debounce interactions, optimize event handlers, reduce JavaScript execution time',
      CLS: 'Set image/video dimensions, avoid dynamic content insertion, use CSS transforms',
      FCP: 'Optimize critical rendering path, inline critical CSS, preload fonts',
      TTFB: 'Optimize server response time, use caching, upgrade hosting infrastructure',
    };

    return recommendations[metric] || 'Monitor and optimize this metric';
  }

  generateComprehensiveReport(
    timeWindow = 3_600_000,
  ): ComprehensivePerformanceReport {
    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    // Get server performance data
    const serverReport = generatePerformanceReport(timeWindow);

    // Get alerts from budget monitor
    const alerts = budgetMonitor.getAlerts({ since: startTime });

    // Mock client-side metrics (in real implementation, fetch from database)
    const mockClientMetrics: Record<WebVitalMetric, number> = {
      LCP: 2100,
      INP: 180,
      CLS: 0.08,
      FCP: 1650,
      TTFB: 720,
    };

    // Generate insights
    const insights = this.generateInsights(mockClientMetrics);

    // Calculate overall score (0-100)
    const coreVitalsScore = this.calculateCoreWebVitalsScore(mockClientMetrics);
    const serverScore = this.calculateServerScore(serverReport);
    const overallScore = Math.round((coreVitalsScore + serverScore) / 2);

    // Check if Core Web Vitals pass
    const coreWebVitalsPass = ['LCP', 'INP', 'CLS'].every(
      (metric) =>
        getPerformanceRating(
          metric as WebVitalMetric,
          mockClientMetrics[metric as WebVitalMetric],
        ) === 'good',
    );

    // Generate actionable recommendations
    const recommendations = this.generateRecommendations(
      insights,
      serverReport,
    );

    return {
      id: `report-${Date.now()}`,
      timestamp: endTime,
      timeRange: {
        start: startTime,
        end: endTime,
        duration: timeWindow,
      },
      summary: {
        overallScore,
        coreWebVitalsPass,
        totalAlerts: alerts.length,
        criticalIssues: alerts.filter((a) => a.severity === 'critical').length,
      },
      metrics: {
        coreWebVitals: Object.fromEntries(
          Object.entries(mockClientMetrics).map(([metric, value]) => [
            metric,
            {
              value,
              rating: getPerformanceRating(metric as WebVitalMetric, value),
              trend: 'stable' as const, // Would be calculated from historical data
              percentileP75: value * 1.1,
              percentileP95: value * 1.3,
            },
          ]),
        ) as Record<WebVitalMetric, any>,
        server: serverReport,
      },
      insights,
      alerts,
      recommendations,
    };
  }

  private calculateCoreWebVitalsScore(
    metrics: Record<WebVitalMetric, number>,
  ): number {
    const coreVitals: WebVitalMetric[] = ['LCP', 'INP', 'CLS'];
    const scores = coreVitals.map((metric) => {
      const rating = getPerformanceRating(metric, metrics[metric]);
      switch (rating) {
        case 'good':
          return 100;
        case 'needs-improvement':
          return 50;
        case 'poor':
          return 0;
        default:
          return 0;
      }
    });

    return Math.round(
      scores.reduce((sum: number, score: number) => sum + score, 0) /
        scores.length,
    );
  }

  private calculateServerScore(serverReport: PerformanceReport): number {
    let score = 100;

    // Penalize high response times
    if (serverReport.summary.averageResponseTime > 1000) {
      score -= 30;
    } else if (serverReport.summary.averageResponseTime > 500) {
      score -= 15;
    }

    // Penalize high error rates
    if (serverReport.summary.errorRate > 0.05) {
      score -= 40;
    } else if (serverReport.summary.errorRate > 0.01) {
      score -= 20;
    }

    // Penalize slow database queries
    if (serverReport.database.averageQueryTime > 100) {
      score -= 20;
    } else if (serverReport.database.averageQueryTime > 50) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private generateRecommendations(
    insights: PerformanceInsight[],
    serverReport: PerformanceReport,
  ): string[] {
    const recommendations: string[] = [];

    // Add actionable insights as recommendations
    insights
      .filter((insight) => insight.actionable && insight.recommendation)
      .forEach((insight) => {
        if (insight.recommendation) {
          recommendations.push(insight.recommendation);
        }
      });

    // Add server-specific recommendations
    if (serverReport.summary.averageResponseTime > 500) {
      recommendations.push(
        'Optimize API response times by implementing caching and database query optimization',
      );
    }

    if (serverReport.summary.errorRate > 0.01) {
      recommendations.push(
        'Investigate and fix the root causes of API errors to improve reliability',
      );
    }

    if (serverReport.database.slowestQueries.length > 0) {
      recommendations.push(
        'Optimize slow database queries by adding indexes or refactoring query logic',
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  exportReportAsMarkdown(report: ComprehensivePerformanceReport): string {
    const date = new Date(report.timestamp).toISOString().split('T')[0];
    const duration = Math.round(report.timeRange.duration / (1000 * 60 * 60)); // hours

    return `# Performance Report - ${date}

## Summary
- **Overall Score**: ${report.summary.overallScore}/100
- **Core Web Vitals**: ${report.summary.coreWebVitalsPass ? '✅ Pass' : '❌ Fail'}
- **Time Range**: ${duration} hour(s)
- **Total Alerts**: ${report.summary.totalAlerts}
- **Critical Issues**: ${report.summary.criticalIssues}

## Core Web Vitals

| Metric | Value | Rating | P95 |
|--------|-------|--------|-----|
${Object.entries(report.metrics.coreWebVitals)
  .map(
    ([metric, data]) =>
      `| ${metric} | ${formatMetricValue(metric as WebVitalMetric, data.value)} | ${data.rating} | ${formatMetricValue(metric as WebVitalMetric, data.percentileP95)} |`,
  )
  .join('\n')}

## Key Insights

${report.insights
  .map(
    (insight) => `### ${insight.title}
- **Type**: ${insight.type}
- **Impact**: ${insight.impact}
- **Description**: ${insight.description}
${insight.recommendation ? `- **Recommendation**: ${insight.recommendation}` : ''}`,
  )
  .join('\n\n')}

## Server Performance

- **Total Requests**: ${report.metrics.server.summary.totalRequests.toLocaleString()}
- **Average Response Time**: ${Math.round(report.metrics.server.summary.averageResponseTime)}ms
- **Error Rate**: ${(report.metrics.server.summary.errorRate * 100).toFixed(2)}%
- **Database Queries**: ${report.metrics.server.database.totalQueries.toLocaleString()}
- **Average Query Time**: ${Math.round(report.metrics.server.database.averageQueryTime)}ms

## Recommendations

${report.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Recent Alerts

${
  report.alerts.length > 0
    ? report.alerts
        .slice(0, 10)
        .map(
          (alert) =>
            `- **${alert.severity.toUpperCase()}**: ${alert.metric} exceeded budget by ${Math.round(alert.exceedsBy)}ms on ${new URL(alert.url).pathname}`,
        )
        .join('\n')
    : 'No recent alerts'
}

---
*Generated on ${new Date(report.timestamp).toISOString()}*
`;
  }
}

export const reportGenerator = new PerformanceReportGenerator();
