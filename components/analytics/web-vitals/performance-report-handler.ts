import { budgetMonitor } from '@/lib/performance/budgets';
import {
  checkPerformanceBudget,
  type PerformanceData,
} from '@/lib/performance/web-vitals';

// Constants for configuration
const MAX_STORED_ENTRIES = 100;

export type ReportHandlerOptions = {
  debug?: boolean;
};

export class PerformanceReportHandler {
  private readonly debug: boolean;

  constructor(options: ReportHandlerOptions = {}) {
    this.debug = options.debug ?? false;
  }

  async handleReport(data: PerformanceData): Promise<void> {
    if (this.debug) {
      this.logPerformanceData(data);
    }

    this.checkBudgetCompliance(data);
    this.checkBudgetAlerts(data);
    this.storeInLocalStorage(data);
    await this.sendToAnalytics(data);
  }

  private logPerformanceData(_data: PerformanceData): void {
    // Performance data logging disabled in production
  }

  private checkBudgetCompliance(data: PerformanceData): void {
    const budgetCheck = checkPerformanceBudget(data);
    if (!budgetCheck.passed && this.debug) {
      // Budget compliance logging disabled in production
    }
  }

  private checkBudgetAlerts(data: PerformanceData): void {
    const alert = budgetMonitor.checkBudget(data);
    if (alert && this.debug) {
      // Budget alert logging disabled in production
    }
  }

  private storeInLocalStorage(data: PerformanceData): void {
    try {
      const stored = localStorage.getItem('webVitalsData');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [...existing, data].slice(-MAX_STORED_ENTRIES); // Keep last entries within limit
      localStorage.setItem('webVitalsData', JSON.stringify(updated));
    } catch (_error) {
      if (this.debug) {
        // localStorage error logging disabled in production
      }
    }
  }

  private async sendToAnalytics(data: PerformanceData): Promise<void> {
    try {
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (_error) {
      if (this.debug) {
        // localStorage error logging disabled in production
      }
    }
  }
}
