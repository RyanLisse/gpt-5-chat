import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

export interface PerformanceTestResult {
  name: string;
  duration: number;
  passed: boolean;
  failed: boolean;
  skipped: boolean;
  error?: string;
  metrics?: {
    averageTime?: number;
    operationsPerSecond?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
    environment: {
      nodeVersion: string;
      platform: string;
      arch: string;
      cpus: number;
      memory: string;
    };
  };
  categories: {
    [category: string]: {
      tests: PerformanceTestResult[];
      summary: {
        passed: number;
        failed: number;
        avgDuration: number;
      };
    };
  };
  benchmarks: {
    [benchmark: string]: {
      averageTime: number;
      operationsPerSecond: number;
      baseline?: number;
      regression?: number;
    };
  };
  alerts: Array<{
    type: 'performance' | 'memory' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    test: string;
    value?: number;
    threshold?: number;
  }>;
}

export class PerformanceTestRunner {
  private resultsDir: string;
  private configPath: string;

  constructor(private rootDir: string) {
    this.resultsDir = join(rootDir, 'tests/performance/results');
    this.configPath = join(
      rootDir,
      'tests/performance/vitest.performance.config.ts',
    );

    // Ensure results directory exists
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting comprehensive performance test suite...');

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    const categories = [
      {
        name: 'API Endpoints',
        pattern: 'tests/performance/api/**/*.perf.test.ts',
      },
      {
        name: 'Database Queries',
        pattern: 'tests/performance/database/**/*.perf.test.ts',
      },
      {
        name: 'Memory Usage',
        pattern: 'tests/performance/memory/**/*.perf.test.ts',
      },
      {
        name: 'Chat Streaming',
        pattern: 'tests/performance/chat/**/*.perf.test.ts',
      },
      {
        name: 'Critical Paths',
        pattern: 'tests/performance/benchmarks/**/*.bench.test.ts',
      },
    ];

    const report: PerformanceReport = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        timestamp,
        environment: this.getEnvironmentInfo(),
      },
      categories: {},
      benchmarks: {},
      alerts: [],
    };

    for (const category of categories) {
      console.log(`\n📊 Running ${category.name} tests...`);

      try {
        const categoryResult = await this.runTestCategory(
          category.name,
          category.pattern,
        );
        report.categories[category.name] = categoryResult;

        // Update summary
        report.summary.totalTests += categoryResult.tests.length;
        report.summary.passed += categoryResult.summary.passed;
        report.summary.failed += categoryResult.summary.failed;

        // Extract benchmarks and alerts
        this.extractBenchmarks(categoryResult.tests, report.benchmarks);
        this.generateAlerts(categoryResult.tests, report.alerts, category.name);
      } catch (error) {
        console.error(`❌ Failed to run ${category.name} tests:`, error);
        report.alerts.push({
          type: 'error',
          severity: 'critical',
          message: `Failed to run ${category.name} tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
          test: category.name,
        });
      }
    }

    report.summary.duration = performance.now() - startTime;

    // Generate reports
    await this.generateReports(report);

    console.log(
      `\n✅ Performance testing completed in ${(report.summary.duration / 1000).toFixed(2)}s`,
    );
    console.log(
      `📊 Results: ${report.summary.passed} passed, ${report.summary.failed} failed`,
    );

    return report;
  }

  async runTestCategory(
    categoryName: string,
    pattern: string,
  ): Promise<{
    tests: PerformanceTestResult[];
    summary: { passed: number; failed: number; avgDuration: number };
  }> {
    const command = `bunx vitest run --config=${this.configPath} --reporter=json --outputFile=${this.resultsDir}/${categoryName.toLowerCase().replace(/\s+/g, '-')}.json "${pattern}"`;

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.rootDir,
        timeout: 300000, // 5 minutes timeout
      });

      return this.parseTestResults(output, categoryName);
    } catch (error) {
      console.error(`Failed to run tests for ${categoryName}:`, error);

      return {
        tests: [
          {
            name: `${categoryName} - Test Execution`,
            duration: 0,
            passed: false,
            failed: true,
            skipped: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        summary: { passed: 0, failed: 1, avgDuration: 0 },
      };
    }
  }

  private parseTestResults(
    output: string,
    categoryName: string,
  ): {
    tests: PerformanceTestResult[];
    summary: { passed: number; failed: number; avgDuration: number };
  } {
    const tests: PerformanceTestResult[] = [];
    let passed = 0;
    let failed = 0;
    let totalDuration = 0;

    try {
      // Parse Vitest JSON output
      const lines = output.split('\n').filter((line) => line.trim());
      const jsonLine = lines.find(
        (line) => line.startsWith('{') && line.includes('testResults'),
      );

      if (jsonLine) {
        const result = JSON.parse(jsonLine);

        if (result.testResults) {
          for (const testResult of result.testResults) {
            for (const assertionResult of testResult.assertionResults || []) {
              const test: PerformanceTestResult = {
                name: assertionResult.title || assertionResult.fullName,
                duration: assertionResult.duration || 0,
                passed: assertionResult.status === 'passed',
                failed: assertionResult.status === 'failed',
                skipped: assertionResult.status === 'skipped',
                error: assertionResult.failureMessage,
              };

              tests.push(test);
              totalDuration += test.duration;

              if (test.passed) passed++;
              if (test.failed) failed++;
            }
          }
        }
      } else {
        // Fallback: try to parse console output
        console.warn(
          `Could not parse JSON output for ${categoryName}, using fallback parsing`,
        );

        const passedMatches = output.match(/(\d+) passed/);
        const failedMatches = output.match(/(\d+) failed/);

        if (passedMatches) passed = parseInt(passedMatches[1], 10);
        if (failedMatches) failed = parseInt(failedMatches[1], 10);

        tests.push({
          name: `${categoryName} - Summary`,
          duration: 0,
          passed: failed === 0,
          failed: failed > 0,
          skipped: false,
        });
      }
    } catch (parseError) {
      console.error(
        `Failed to parse test results for ${categoryName}:`,
        parseError,
      );

      tests.push({
        name: `${categoryName} - Parse Error`,
        duration: 0,
        passed: false,
        failed: true,
        skipped: false,
        error: `Failed to parse results: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      });
      failed = 1;
    }

    const avgDuration = tests.length > 0 ? totalDuration / tests.length : 0;

    return {
      tests,
      summary: { passed, failed, avgDuration },
    };
  }

  private extractBenchmarks(
    tests: PerformanceTestResult[],
    benchmarks: PerformanceReport['benchmarks'],
  ): void {
    for (const test of tests) {
      if (test.metrics?.averageTime && test.metrics?.operationsPerSecond) {
        benchmarks[test.name] = {
          averageTime: test.metrics.averageTime,
          operationsPerSecond: test.metrics.operationsPerSecond,
        };
      }
    }
  }

  private generateAlerts(
    tests: PerformanceTestResult[],
    alerts: PerformanceReport['alerts'],
    _category: string,
  ): void {
    for (const test of tests) {
      // Performance alerts
      if (test.metrics?.averageTime && test.metrics.averageTime > 1000) {
        alerts.push({
          type: 'performance',
          severity: test.metrics.averageTime > 5000 ? 'critical' : 'high',
          message: `Slow performance detected: ${test.metrics.averageTime.toFixed(2)}ms average`,
          test: test.name,
          value: test.metrics.averageTime,
          threshold: 1000,
        });
      }

      // Memory alerts
      if (
        test.metrics?.memoryUsage &&
        test.metrics.memoryUsage > 100 * 1024 * 1024
      ) {
        // 100MB
        alerts.push({
          type: 'memory',
          severity:
            test.metrics.memoryUsage > 500 * 1024 * 1024
              ? 'critical'
              : 'medium',
          message: `High memory usage: ${(test.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
          test: test.name,
          value: test.metrics.memoryUsage,
          threshold: 100 * 1024 * 1024,
        });
      }

      // Error rate alerts
      if (test.metrics?.errorRate && test.metrics.errorRate > 5) {
        alerts.push({
          type: 'error',
          severity: test.metrics.errorRate > 20 ? 'critical' : 'high',
          message: `High error rate: ${test.metrics.errorRate.toFixed(1)}%`,
          test: test.name,
          value: test.metrics.errorRate,
          threshold: 5,
        });
      }

      // Test failures
      if (test.failed) {
        alerts.push({
          type: 'error',
          severity: 'high',
          message: test.error || 'Test failed',
          test: test.name,
        });
      }
    }
  }

  private getEnvironmentInfo() {
    const os = require('node:os');

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`,
    };
  }

  private async generateReports(report: PerformanceReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON report
    const jsonPath = join(
      this.resultsDir,
      `performance-report-${timestamp}.json`,
    );
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Markdown report
    const markdownPath = join(
      this.resultsDir,
      `performance-report-${timestamp}.md`,
    );
    const markdown = this.generateMarkdownReport(report);
    writeFileSync(markdownPath, markdown);

    // HTML report
    const htmlPath = join(
      this.resultsDir,
      `performance-report-${timestamp}.html`,
    );
    const html = this.generateHtmlReport(report);
    writeFileSync(htmlPath, html);

    // Latest symlinks (overwrite)
    const latestJsonPath = join(this.resultsDir, 'latest-report.json');
    const latestMarkdownPath = join(this.resultsDir, 'latest-report.md');
    const latestHtmlPath = join(this.resultsDir, 'latest-report.html');

    writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));
    writeFileSync(latestMarkdownPath, markdown);
    writeFileSync(latestHtmlPath, html);

    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  private generateMarkdownReport(report: PerformanceReport): string {
    const { summary, categories, benchmarks, alerts } = report;

    let markdown = `# Performance Test Report\n\n`;
    markdown += `**Generated:** ${summary.timestamp}\n`;
    markdown += `**Duration:** ${(summary.duration / 1000).toFixed(2)}s\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${summary.totalTests}\n`;
    markdown += `- **Passed:** ${summary.passed} ✅\n`;
    markdown += `- **Failed:** ${summary.failed} ${summary.failed > 0 ? '❌' : ''}\n`;
    markdown += `- **Success Rate:** ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%\n\n`;

    // Environment
    markdown += `## Environment\n\n`;
    markdown += `- **Node.js:** ${summary.environment.nodeVersion}\n`;
    markdown += `- **Platform:** ${summary.environment.platform} ${summary.environment.arch}\n`;
    markdown += `- **CPUs:** ${summary.environment.cpus}\n`;
    markdown += `- **Memory:** ${summary.environment.memory}\n\n`;

    // Categories
    markdown += `## Test Categories\n\n`;
    for (const [categoryName, category] of Object.entries(categories)) {
      markdown += `### ${categoryName}\n\n`;
      markdown += `- **Passed:** ${category.summary.passed}\n`;
      markdown += `- **Failed:** ${category.summary.failed}\n`;
      markdown += `- **Average Duration:** ${category.summary.avgDuration.toFixed(2)}ms\n\n`;

      if (category.tests.some((t) => t.failed)) {
        markdown += `**Failed Tests:**\n`;
        category.tests
          .filter((t) => t.failed)
          .forEach((test) => {
            markdown += `- ${test.name}: ${test.error || 'Unknown error'}\n`;
          });
        markdown += `\n`;
      }
    }

    // Benchmarks
    if (Object.keys(benchmarks).length > 0) {
      markdown += `## Benchmarks\n\n`;
      markdown += `| Test | Avg Time (ms) | Ops/sec |\n`;
      markdown += `|------|---------------|----------|\n`;
      for (const [name, benchmark] of Object.entries(benchmarks)) {
        markdown += `| ${name} | ${benchmark.averageTime.toFixed(2)} | ${benchmark.operationsPerSecond.toFixed(0)} |\n`;
      }
      markdown += `\n`;
    }

    // Alerts
    if (alerts.length > 0) {
      markdown += `## Alerts\n\n`;

      const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
      const highAlerts = alerts.filter((a) => a.severity === 'high');
      const mediumAlerts = alerts.filter((a) => a.severity === 'medium');

      if (criticalAlerts.length > 0) {
        markdown += `### 🚨 Critical Alerts\n\n`;
        criticalAlerts.forEach((alert) => {
          markdown += `- **${alert.test}:** ${alert.message}\n`;
        });
        markdown += `\n`;
      }

      if (highAlerts.length > 0) {
        markdown += `### ⚠️ High Priority Alerts\n\n`;
        highAlerts.forEach((alert) => {
          markdown += `- **${alert.test}:** ${alert.message}\n`;
        });
        markdown += `\n`;
      }

      if (mediumAlerts.length > 0) {
        markdown += `### ℹ️ Medium Priority Alerts\n\n`;
        mediumAlerts.forEach((alert) => {
          markdown += `- **${alert.test}:** ${alert.message}\n`;
        });
        markdown += `\n`;
      }
    }

    return markdown;
  }

  private generateHtmlReport(report: PerformanceReport): string {
    const { summary, categories, benchmarks, alerts } = report;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .card.success { border-left-color: #28a745; }
        .card.error { border-left-color: #dc3545; }
        .card.warning { border-left-color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .alert.critical { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert.high { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .alert.medium { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        .metric { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric.success { color: #28a745; }
        .metric.error { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Duration:</strong> ${(summary.duration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>Total Tests</h3>
            <div class="metric">${summary.totalTests}</div>
        </div>
        <div class="card success">
            <h3>Passed</h3>
            <div class="metric success">${summary.passed}</div>
        </div>
        <div class="card ${summary.failed > 0 ? 'error' : ''}">
            <h3>Failed</h3>
            <div class="metric ${summary.failed > 0 ? 'error' : ''}">${summary.failed}</div>
        </div>
        <div class="card">
            <h3>Success Rate</h3>
            <div class="metric">${((summary.passed / summary.totalTests) * 100).toFixed(1)}%</div>
        </div>
    </div>

    <h2>Test Categories</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Avg Duration (ms)</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(categories)
              .map(
                ([name, category]) => `
                <tr>
                    <td>${name}</td>
                    <td>${category.summary.passed}</td>
                    <td>${category.summary.failed}</td>
                    <td>${category.summary.avgDuration.toFixed(2)}</td>
                </tr>
            `,
              )
              .join('')}
        </tbody>
    </table>

    ${
      Object.keys(benchmarks).length > 0
        ? `
    <h2>Benchmarks</h2>
    <table>
        <thead>
            <tr>
                <th>Test</th>
                <th>Average Time (ms)</th>
                <th>Operations/sec</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(benchmarks)
              .map(
                ([name, benchmark]) => `
                <tr>
                    <td>${name}</td>
                    <td>${benchmark.averageTime.toFixed(2)}</td>
                    <td>${benchmark.operationsPerSecond.toFixed(0)}</td>
                </tr>
            `,
              )
              .join('')}
        </tbody>
    </table>
    `
        : ''
    }

    ${
      alerts.length > 0
        ? `
    <h2>Alerts</h2>
    ${alerts
      .map(
        (alert) => `
        <div class="alert ${alert.severity}">
            <strong>${alert.test}:</strong> ${alert.message}
        </div>
    `,
      )
      .join('')}
    `
        : ''
    }

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>Environment: Node.js ${summary.environment.nodeVersion} on ${summary.environment.platform} ${summary.environment.arch}</p>
        <p>System: ${summary.environment.cpus} CPUs, ${summary.environment.memory} RAM</p>
    </div>
</body>
</html>`;
  }
}

// CLI runner
if (require.main === module) {
  const runner = new PerformanceTestRunner(process.cwd());

  runner
    .runAllTests()
    .then((report) => {
      const hasFailures = report.summary.failed > 0;
      const hasCriticalAlerts = report.alerts.some(
        (a) => a.severity === 'critical',
      );

      if (hasFailures || hasCriticalAlerts) {
        console.error(
          '❌ Performance tests failed or critical issues detected',
        );
        process.exit(1);
      } else {
        console.log('✅ All performance tests passed');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Performance test runner failed:', error);
      process.exit(1);
    });
}
