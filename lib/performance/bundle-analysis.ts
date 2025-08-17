import { exec } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type BundleAsset = {
  name: string;
  size: number;
  gzipSize?: number;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
  chunks: string[];
  modules?: string[];
};

export type BundleAnalysis = {
  timestamp: number;
  buildHash: string;
  totalSize: number;
  totalGzipSize: number;
  assets: BundleAsset[];
  chunks: Array<{
    name: string;
    size: number;
    files: string[];
    modules: Array<{
      name: string;
      size: number;
      reasons: string[];
    }>;
  }>;
  treemap?: {
    name: string;
    children: Array<{
      name: string;
      size: number;
      children?: any[];
    }>;
  };
};

export type BundleBudget = {
  name: string;
  type: 'initial' | 'allScript' | 'all' | 'anyComponentStyle' | 'any';
  maximumWarning: number; // bytes
  maximumError: number; // bytes
  minimumWarning?: number; // bytes
  minimumError?: number; // bytes
};

export type BundleBudgetResult = {
  budget: BundleBudget;
  size: number;
  status: 'pass' | 'warning' | 'error';
  message: string;
};

export const DEFAULT_BUNDLE_BUDGETS: BundleBudget[] = [
  {
    name: 'initial-bundle',
    type: 'initial',
    maximumWarning: 500 * 1024, // 500KB
    maximumError: 1024 * 1024, // 1MB
  },
  {
    name: 'all-scripts',
    type: 'allScript',
    maximumWarning: 2 * 1024 * 1024, // 2MB
    maximumError: 3 * 1024 * 1024, // 3MB
  },
  {
    name: 'any-chunk',
    type: 'any',
    maximumWarning: 250 * 1024, // 250KB
    maximumError: 500 * 1024, // 500KB
  },
];

export class BundleAnalyzer {
  private readonly projectRoot: string;
  private readonly outputDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.outputDir = join(projectRoot, '.next');
  }

  async analyzeBuild(): Promise<BundleAnalysis> {
    try {
      // Run Next.js bundle analyzer
      const { stdout } = await execAsync('npx next build --profile', {
        cwd: this.projectRoot,
        env: { ...process.env, ANALYZE: 'true' },
      });

      // Parse build output for basic stats
      const buildStats = this.parseBuildOutput(stdout);

      // Read webpack stats if available
      const webpackStats = await this.readWebpackStats();

      // Combine data sources
      const analysis: BundleAnalysis = {
        timestamp: Date.now(),
        buildHash: this.generateBuildHash(),
        totalSize: buildStats.totalSize,
        totalGzipSize: buildStats.totalGzipSize,
        assets: await this.getAssetList(),
        chunks: webpackStats?.chunks || [],
        treemap: await this.generateTreemap(),
      };

      // Save analysis for historical tracking
      await this.saveAnalysis(analysis);

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze bundle: ${error}`);
    }
  }

  async checkBudgets(
    analysis: BundleAnalysis,
    budgets: BundleBudget[] = DEFAULT_BUNDLE_BUDGETS,
  ): Promise<BundleBudgetResult[]> {
    const results: BundleBudgetResult[] = [];

    for (const budget of budgets) {
      const size = this.calculateBudgetSize(analysis, budget);
      const result = this.evaluateBudget(budget, size);
      results.push(result);
    }

    return results;
  }

  private parseBuildOutput(output: string): {
    totalSize: number;
    totalGzipSize: number;
  } {
    // Parse Next.js build output to extract size information
    const lines = output.split('\n');
    let totalSize = 0;
    let totalGzipSize = 0;

    for (const line of lines) {
      // Look for size information in build output
      const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*(kB|MB|B)/);
      if (sizeMatch) {
        const size = Number.parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        const bytes = this.convertToBytes(size, unit);

        if (line.includes('gzip')) {
          totalGzipSize += bytes;
        } else {
          totalSize += bytes;
        }
      }
    }

    return { totalSize, totalGzipSize };
  }

  private convertToBytes(size: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'kb':
        return size * 1024;
      case 'mb':
        return size * 1024 * 1024;
      case 'gb':
        return size * 1024 * 1024 * 1024;
      default:
        return size;
    }
  }

  private async readWebpackStats(): Promise<any> {
    try {
      const statsPath = join(this.outputDir, 'webpack-stats.json');
      const statsContent = await readFile(statsPath, 'utf-8');
      return JSON.parse(statsContent);
    } catch {
      return null;
    }
  }

  private async getAssetList(): Promise<BundleAsset[]> {
    try {
      const buildManifest = await this.readBuildManifest();
      const assets: BundleAsset[] = [];

      // Process build manifest to extract asset information
      for (const [route, files] of Object.entries(buildManifest.pages || {})) {
        if (Array.isArray(files)) {
          for (const file of files) {
            if (typeof file === 'string') {
              const asset = await this.createAssetInfo(file, [route]);
              if (asset) {
                assets.push(asset);
              }
            }
          }
        }
      }

      return assets;
    } catch (_error) {
      return [];
    }
  }

  private async readBuildManifest(): Promise<any> {
    const manifestPath = join(this.outputDir, 'build-manifest.json');
    const content = await readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  private async createAssetInfo(
    fileName: string,
    chunks: string[],
  ): Promise<BundleAsset | null> {
    try {
      const filePath = join(this.outputDir, 'static', fileName);
      const stats = await import('node:fs').then((fs) =>
        fs.promises.stat(filePath),
      );

      return {
        name: fileName,
        size: stats.size,
        type: this.getAssetType(fileName),
        chunks,
      };
    } catch {
      return null;
    }
  }

  private getAssetType(fileName: string): BundleAsset['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
        return 'js';
      case 'css':
        return 'css';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return 'font';
      default:
        return 'other';
    }
  }

  private async generateTreemap(): Promise<BundleAnalysis['treemap']> {
    // Generate a simple treemap structure
    // In a real implementation, you'd use webpack-bundle-analyzer data
    return {
      name: 'root',
      children: [
        {
          name: 'app',
          size: 500_000,
          children: [],
        },
        {
          name: 'node_modules',
          size: 1_500_000,
          children: [],
        },
      ],
    };
  }

  private generateBuildHash(): string {
    return `build-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private calculateBudgetSize(
    analysis: BundleAnalysis,
    budget: BundleBudget,
  ): number {
    switch (budget.type) {
      case 'initial':
        return analysis.assets
          .filter(
            (asset) =>
              asset.chunks.includes('main') || asset.chunks.includes('_app'),
          )
          .reduce((sum, asset) => sum + asset.size, 0);

      case 'allScript':
        return analysis.assets
          .filter((asset) => asset.type === 'js')
          .reduce((sum, asset) => sum + asset.size, 0);

      case 'all':
        return analysis.totalSize;

      case 'any':
        return Math.max(...analysis.assets.map((asset) => asset.size));

      case 'anyComponentStyle':
        return Math.max(
          ...analysis.assets
            .filter((asset) => asset.type === 'css')
            .map((asset) => asset.size),
        );

      default:
        return 0;
    }
  }

  private evaluateBudget(
    budget: BundleBudget,
    size: number,
  ): BundleBudgetResult {
    let status: 'pass' | 'warning' | 'error' = 'pass';
    let message = `${budget.name}: ${this.formatBytes(size)}`;

    if (size >= budget.maximumError) {
      status = 'error';
      message += ` exceeds maximum error threshold (${this.formatBytes(budget.maximumError)})`;
    } else if (size >= budget.maximumWarning) {
      status = 'warning';
      message += ` exceeds warning threshold (${this.formatBytes(budget.maximumWarning)})`;
    } else {
      message += ` is within budget`;
    }

    return {
      budget,
      size,
      status,
      message,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private async saveAnalysis(analysis: BundleAnalysis): Promise<void> {
    try {
      const historyPath = join(
        this.projectRoot,
        '.next',
        'bundle-analysis-history.json',
      );
      let history: BundleAnalysis[] = [];

      try {
        const existingContent = await readFile(historyPath, 'utf-8');
        history = JSON.parse(existingContent);
      } catch {
        // File doesn't exist, start with empty history
      }

      // Add current analysis
      history.push(analysis);

      // Keep only last 50 analyses
      if (history.length > 50) {
        history = history.slice(-50);
      }

      await writeFile(historyPath, JSON.stringify(history, null, 2));
    } catch (_error) {}
  }

  async getAnalysisHistory(): Promise<BundleAnalysis[]> {
    try {
      const historyPath = join(
        this.projectRoot,
        '.next',
        'bundle-analysis-history.json',
      );
      const content = await readFile(historyPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async compareWithPrevious(current: BundleAnalysis): Promise<{
    sizeDiff: number;
    gzipSizeDiff: number;
    newAssets: BundleAsset[];
    removedAssets: BundleAsset[];
    changedAssets: Array<{
      name: string;
      oldSize: number;
      newSize: number;
      diff: number;
    }>;
  }> {
    const history = await this.getAnalysisHistory();
    const previous = history.at(-2); // Second to last

    if (!previous) {
      return {
        sizeDiff: 0,
        gzipSizeDiff: 0,
        newAssets: current.assets,
        removedAssets: [],
        changedAssets: [],
      };
    }

    const sizeDiff = current.totalSize - previous.totalSize;
    const gzipSizeDiff = current.totalGzipSize - previous.totalGzipSize;

    const currentAssetMap = new Map(current.assets.map((a) => [a.name, a]));
    const previousAssetMap = new Map(previous.assets.map((a) => [a.name, a]));

    const newAssets = current.assets.filter(
      (a) => !previousAssetMap.has(a.name),
    );
    const removedAssets = previous.assets.filter(
      (a) => !currentAssetMap.has(a.name),
    );

    const changedAssets = current.assets
      .filter((a) => previousAssetMap.has(a.name))
      .map((a) => {
        const prev = previousAssetMap.get(a.name)!;
        return {
          name: a.name,
          oldSize: prev.size,
          newSize: a.size,
          diff: a.size - prev.size,
        };
      })
      .filter((a) => a.diff !== 0);

    return {
      sizeDiff,
      gzipSizeDiff,
      newAssets,
      removedAssets,
      changedAssets,
    };
  }
}

export const bundleAnalyzer = new BundleAnalyzer();
