#!/usr/bin/env node

/**
 * Bundle Analysis Helper Script
 *
 * Provides an interactive CLI for bundle analysis operations
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ANALYZE_DIR = path.join(process.cwd(), 'analyze');

function ensureAnalyzeDir() {
  if (!fs.existsSync(ANALYZE_DIR)) {
    fs.mkdirSync(ANALYZE_DIR, { recursive: true });
  }
}

function runCommand(command, _description) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (_error) {
    process.exit(1);
  }
}

function openReport(reportPath) {
  if (fs.existsSync(reportPath)) {
    let openCommand;
    if (process.platform === 'darwin') {
      openCommand = 'open';
    } else if (process.platform === 'win32') {
      openCommand = 'start';
    } else {
      openCommand = 'xdg-open';
    }

    try {
      execSync(`${openCommand} ${reportPath}`);
    } catch (_error) {}
  }
}

function showHelp() {}

function checkBundleSize() {
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    return;
  }

  try {
    const staticDir = path.join(nextDir, 'static', 'chunks');
    if (fs.existsSync(staticDir)) {
      const files = fs
        .readdirSync(staticDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => {
          const filepath = path.join(staticDir, file);
          const stats = fs.statSync(filepath);
          return {
            name: file,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
          };
        })
        .sort((a, b) => b.size - a.size);

      files.forEach((_file) => {});

      const _totalSize = files.reduce((sum, file) => sum + file.size, 0);
    }
  } catch (_error) {}
}

function main() {
  const command = process.argv[2] || 'interactive';

  ensureAnalyzeDir();

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'interactive':
    case 'i':
      runCommand('bun run analyze', 'Running interactive bundle analysis');
      break;

    case 'client':
    case 'browser':
      runCommand('bun run analyze:browser', 'Analyzing client-side bundle');
      setTimeout(() => {
        openReport(path.join(ANALYZE_DIR, 'client.html'));
      }, 1000);
      break;

    case 'server':
      runCommand('bun run analyze:server', 'Analyzing server-side bundle');
      setTimeout(() => {
        openReport(path.join(ANALYZE_DIR, 'server.html'));
      }, 1000);
      break;

    case 'both':
      runCommand(
        'bun run analyze:both',
        'Analyzing both client and server bundles',
      );
      setTimeout(() => {
        openReport(path.join(ANALYZE_DIR, 'client.html'));
        setTimeout(() => {
          openReport(path.join(ANALYZE_DIR, 'server.html'));
        }, 500);
      }, 1000);
      break;

    case 'size':
    case 'sizes':
      checkBundleSize();
      break;

    default:
      showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
