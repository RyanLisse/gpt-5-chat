import {
  PERFORMANCE_BUDGETS,
  type PerformanceData,
  type WebVitalMetric,
} from './web-vitals';

export type PerformanceAlert = {
  id: string;
  metric: WebVitalMetric;
  value: number;
  budget: number;
  exceedsBy: number;
  url: string;
  timestamp: number;
  severity: 'warning' | 'error' | 'critical';
  sessionId: string;
  userId?: string;
};

export type BudgetConfig = {
  metric: WebVitalMetric;
  warningThreshold: number; // % over budget for warning
  errorThreshold: number; // % over budget for error
  criticalThreshold: number; // % over budget for critical
  enabled: boolean;
};

export const DEFAULT_BUDGET_CONFIG: Record<WebVitalMetric, BudgetConfig> = {
  LCP: {
    metric: 'LCP',
    warningThreshold: 10, // 10% over budget
    errorThreshold: 25, // 25% over budget
    criticalThreshold: 50, // 50% over budget
    enabled: true,
  },
  INP: {
    metric: 'INP',
    warningThreshold: 15,
    errorThreshold: 30,
    criticalThreshold: 60,
    enabled: true,
  },
  CLS: {
    metric: 'CLS',
    warningThreshold: 20,
    errorThreshold: 40,
    criticalThreshold: 80,
    enabled: true,
  },
  FCP: {
    metric: 'FCP',
    warningThreshold: 10,
    errorThreshold: 25,
    criticalThreshold: 50,
    enabled: false, // Not a Core Web Vital
  },
  TTFB: {
    metric: 'TTFB',
    warningThreshold: 15,
    errorThreshold: 30,
    criticalThreshold: 60,
    enabled: false, // Not a Core Web Vital
  },
};

export class PerformanceBudgetMonitor {
  private alerts: PerformanceAlert[] = [];
  private readonly config: Record<WebVitalMetric, BudgetConfig>;
  private readonly onAlert?: (alert: PerformanceAlert) => void;

  constructor(
    config: Record<WebVitalMetric, BudgetConfig> = DEFAULT_BUDGET_CONFIG,
    onAlert?: (alert: PerformanceAlert) => void,
  ) {
    this.config = config;
    this.onAlert = onAlert;
  }

  checkBudget(performanceData: PerformanceData): PerformanceAlert | null {
    const budgetConfig = this.config[performanceData.name as WebVitalMetric];
    if (!budgetConfig?.enabled) {
      return null;
    }

    const budget = PERFORMANCE_BUDGETS.find(
      (b) => b.metric === performanceData.name,
    );
    if (!budget) {
      return null;
    }

    const exceedsBy = performanceData.value - budget.budget;
    if (exceedsBy <= 0) {
      return null; // Within budget
    }

    const exceedsPercentage = (exceedsBy / budget.budget) * 100;

    let severity: PerformanceAlert['severity'];
    if (exceedsPercentage >= budgetConfig.criticalThreshold) {
      severity = 'critical';
    } else if (exceedsPercentage >= budgetConfig.errorThreshold) {
      severity = 'error';
    } else if (exceedsPercentage >= budgetConfig.warningThreshold) {
      severity = 'warning';
    } else {
      return null; // Below warning threshold
    }

    const alert: PerformanceAlert = {
      id: `${performanceData.sessionId}-${performanceData.name}-${Date.now()}`,
      metric: performanceData.name as WebVitalMetric,
      value: performanceData.value,
      budget: budget.budget,
      exceedsBy,
      url: performanceData.url,
      timestamp: performanceData.timestamp,
      severity,
      sessionId: performanceData.sessionId,
      userId: performanceData.userId,
    };

    this.alerts.push(alert);

    // Prevent memory leaks
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }

    if (this.onAlert) {
      this.onAlert(alert);
    }

    return alert;
  }

  getAlerts(
    filters: {
      severity?: PerformanceAlert['severity'];
      metric?: WebVitalMetric;
      since?: number;
      limit?: number;
    } = {},
  ): PerformanceAlert[] {
    let filtered = [...this.alerts];

    if (filters.severity) {
      filtered = filtered.filter(
        (alert) => alert.severity === filters.severity,
      );
    }

    if (filters.metric) {
      filtered = filtered.filter((alert) => alert.metric === filters.metric);
    }

    if (filters.since) {
      filtered = filtered.filter((alert) => alert.timestamp >= filters.since!);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  getAlertStats(timeWindow = 3_600_000): {
    total: number;
    byMetric: Record<WebVitalMetric, number>;
    bySeverity: Record<PerformanceAlert['severity'], number>;
  } {
    const since = Date.now() - timeWindow;
    const recentAlerts = this.getAlerts({ since });

    const byMetric = {} as Record<WebVitalMetric, number>;
    const bySeverity = { warning: 0, error: 0, critical: 0 };

    for (const alert of recentAlerts) {
      byMetric[alert.metric] = (byMetric[alert.metric] || 0) + 1;
      bySeverity[alert.severity]++;
    }

    return {
      total: recentAlerts.length,
      byMetric,
      bySeverity,
    };
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  updateConfig(
    newConfig: Partial<Record<WebVitalMetric, Partial<BudgetConfig>>>,
  ): void {
    for (const [metric, config] of Object.entries(newConfig)) {
      if (this.config[metric as WebVitalMetric]) {
        this.config[metric as WebVitalMetric] = {
          ...this.config[metric as WebVitalMetric],
          ...config,
        };
      }
    }
  }
}

export type NotificationChannel = {
  type: 'email' | 'webhook' | 'console';
  config: Record<string, unknown>;
  enabled: boolean;
};

export class AlertNotificationSystem {
  private readonly channels: NotificationChannel[] = [];

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  async sendAlert(alert: PerformanceAlert): Promise<void> {
    const enabledChannels = this.channels.filter((c) => c.enabled);

    await Promise.allSettled(
      enabledChannels.map((channel) => this.sendToChannel(channel, alert)),
    );
  }

  private async sendToChannel(
    channel: NotificationChannel,
    alert: PerformanceAlert,
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          this.sendToConsole(alert);
          break;
        case 'webhook':
          await this.sendToWebhook(channel.config, alert);
          break;
        case 'email':
          await this.sendToEmail(channel.config, alert);
          break;
        default:
      }
    } catch (_error) {}
  }

  private sendToConsole(alert: PerformanceAlert): void {
    const _message = `Performance Alert [${alert.severity.toUpperCase()}]: ${alert.metric} = ${alert.value}ms (budget: ${alert.budget}ms, exceeds by: ${alert.exceedsBy}ms) on ${alert.url}`;

    switch (alert.severity) {
      case 'critical':
        break;
      case 'error':
        break;
      case 'warning':
        break;
    }
  }

  private async sendToWebhook(
    config: Record<string, unknown>,
    alert: PerformanceAlert,
  ): Promise<void> {
    const url = config.url as string;
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      message: `Performance budget exceeded: ${alert.metric} = ${alert.value}ms (budget: ${alert.budget}ms)`,
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...((config.headers as Record<string, string>) || {}),
      },
      body: JSON.stringify(payload),
    });
  }

  private async sendToEmail(
    _config: Record<string, unknown>,
    _alert: PerformanceAlert,
  ): Promise<void> {}
}

// Global instances
export const alertNotifications = new AlertNotificationSystem();
export const budgetMonitor = new PerformanceBudgetMonitor(
  DEFAULT_BUDGET_CONFIG,
  (alert: PerformanceAlert) => {
    alertNotifications.sendAlert(alert);
  },
);

// Setup default console notifications
alertNotifications.addChannel({
  type: 'console',
  config: {},
  enabled: true,
});

// Budget monitoring with notifications is now configured in constructor above
