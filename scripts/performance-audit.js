#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

async function runPerformanceAudit() {
  try {
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    const reportResponse = await fetch(
      'http://localhost:3000/api/analytics/performance-report?format=markdown&includeBundleAnalysis=true',
    );

    if (!reportResponse.ok) {
      throw new Error(
        `Failed to generate report: ${reportResponse.statusText}`,
      );
    }

    const reportMarkdown = await reportResponse.text();

    // 3. Save report to file
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = path.join(
      reportsDir,
      `performance-report-${timestamp}.md`,
    );
    fs.writeFileSync(reportPath, reportMarkdown);
    const bundleResponse = await fetch(
      'http://localhost:3000/api/analytics/performance-report',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger-bundle-analysis' }),
      },
    );

    if (bundleResponse.ok) {
      const bundleData = await bundleResponse.json();

      bundleData.budgetResults.forEach((result) => {
        let _icon;
        if (result.status === 'pass') {
          _icon = '✅';
        } else if (result.status === 'warning') {
          _icon = '⚠️';
        } else {
          _icon = '❌';
        }
      });
    }
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
    }

    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    process.exit(0);
  }

  const ciMode = args.includes('--ci');

  runPerformanceAudit()
    .then(() => {
      if (ciMode) {
      }
    })
    .catch((_error) => {
      process.exit(1);
    });
}

module.exports = { runPerformanceAudit };
