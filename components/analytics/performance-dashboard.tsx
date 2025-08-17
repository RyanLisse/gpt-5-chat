'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatMetricValue,
  getPerformanceRating,
  type WebVitalMetric,
} from '@/lib/performance/web-vitals';

type MetricData = {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  trend: 'improving' | 'stable' | 'degrading';
  samples: number;
};

type PageData = {
  url: string;
  pageviews: number;
  avgLCP: number;
  avgINP: number;
  avgCLS: number;
};

type DashboardData = {
  timeRange: {
    start: number;
    end: number;
    window: string;
  };
  metrics: Record<WebVitalMetric, MetricData>;
  pages: PageData[];
};

const RATING_STYLES = {
  good: 'text-green-600 bg-green-100',
  'needs-improvement': 'text-yellow-600 bg-yellow-100',
  poor: 'text-red-600 bg-red-100',
} as const;

const TREND_ICONS = {
  improving: <TrendingUp className="h-4 w-4 text-green-600" />,
  degrading: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-gray-600" />,
} as const;

const PROGRESS_VALUES = {
  good: 100,
  'needs-improvement': 60,
  poor: 30,
} as const;

// Helper function to get CSS class based on performance rating
const getPerformanceColorClass = (
  metric: WebVitalMetric,
  value: number,
): string => {
  const rating = getPerformanceRating(metric, value);
  switch (rating) {
    case 'good':
      return 'text-green-600';
    case 'needs-improvement':
      return 'text-yellow-600';
    case 'poor':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const MetricCard = ({
  name,
  label,
  data,
  icon: Icon,
}: {
  name: WebVitalMetric;
  label: string;
  data: MetricData;
  icon: React.ComponentType<{ className?: string }>;
}) => {
  const ratingColor = RATING_STYLES[data.rating] || 'text-gray-600 bg-gray-100';
  const trendIcon = TREND_ICONS[data.trend] || TREND_ICONS.stable;
  const progressValue = PROGRESS_VALUES[data.rating] || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="font-bold text-2xl">
            {formatMetricValue(name, data.value)}
          </div>
          <div className="flex items-center space-x-1">
            {trendIcon}
            <Badge className={ratingColor}>
              {data.rating.replace('-', ' ')}
            </Badge>
          </div>
        </div>
        <div className="mt-2">
          <Progress className="h-2" value={progressValue} />
        </div>
        <p className="mt-2 text-muted-foreground text-xs">
          {data.samples} samples collected
        </p>
      </CardContent>
    </Card>
  );
};

const AlertsSection = ({
  metrics,
}: {
  metrics: Record<WebVitalMetric, MetricData>;
}) => {
  const alerts = Object.entries(metrics)
    .filter(([, data]) => data.rating === 'poor')
    .map(([name, data]) => ({ name: name as WebVitalMetric, data }));

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Performance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">
            All Core Web Vitals are performing well!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Performance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map(({ name, data }) => (
            <div
              className="flex items-center justify-between rounded bg-red-50 p-2"
              key={name}
            >
              <div>
                <span className="font-medium">{name}</span>
                <span className="ml-2 text-gray-600 text-sm">
                  {formatMetricValue(name, data.value)}
                </span>
              </div>
              <Badge variant="destructive">Poor</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PagePerformanceTable = ({ pages }: { pages: PageData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Performance</CardTitle>
        <CardDescription>Performance metrics by page</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Page</th>
                <th className="p-2 text-right">Pageviews</th>
                <th className="p-2 text-right">LCP</th>
                <th className="p-2 text-right">INP</th>
                <th className="p-2 text-right">CLS</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr className="border-b" key={page.url}>
                  <td className="p-2 font-medium">{page.url}</td>
                  <td className="p-2 text-right">
                    {page.pageviews.toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={getPerformanceColorClass('LCP', page.avgLCP)}
                    >
                      {formatMetricValue('LCP', page.avgLCP)}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={getPerformanceColorClass('INP', page.avgINP)}
                    >
                      {formatMetricValue('INP', page.avgINP)}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={getPerformanceColorClass('CLS', page.avgCLS)}
                    >
                      {formatMetricValue('CLS', page.avgCLS)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Hook for managing performance data
function usePerformanceData(timeRange: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/web-vitals?timeRange=${timeRange}`,
      );
      const result = await response.json();
      setData(result);
    } catch (_error) {
      // Silently handle fetch errors, dashboard remains empty on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  return { data, loading, fetchData };
}

// Loading state component
function LoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <RefreshCw className="h-8 w-8 animate-spin" />
    </div>
  );
}

// Empty state component
function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-8 text-center">
      <p>No performance data available</p>
      <Button className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// Time range selector component
function TimeRangeSelector({
  timeRange,
  setTimeRange,
  onRefresh,
}: {
  timeRange: string;
  setTimeRange: (range: string) => void;
  onRefresh: () => void;
}) {
  const timeRanges = ['1h', '24h', '7d', '30d'];

  return (
    <div className="flex items-center space-x-2">
      {timeRanges.map((range) => (
        <Button
          key={range}
          onClick={() => setTimeRange(range)}
          size="sm"
          variant={timeRange === range ? 'default' : 'outline'}
        >
          {range}
        </Button>
      ))}
      <Button onClick={onRefresh} size="sm" variant="outline">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Dashboard header component
function DashboardHeader({
  timeRange,
  setTimeRange,
  onRefresh,
}: {
  timeRange: string;
  setTimeRange: (range: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-bold text-3xl tracking-tight">
          Performance Dashboard
        </h2>
        <p className="text-muted-foreground">
          Core Web Vitals and performance metrics for the last {timeRange}
        </p>
      </div>
      <TimeRangeSelector
        onRefresh={onRefresh}
        setTimeRange={setTimeRange}
        timeRange={timeRange}
      />
    </div>
  );
}

// Main metrics grid component
function MetricsGrid({ metrics }: { metrics: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        data={metrics.LCP}
        icon={Clock}
        label="Largest Contentful Paint"
        name="LCP"
      />
      <MetricCard
        data={metrics.INP}
        icon={Zap}
        label="Interaction to Next Paint"
        name="INP"
      />
      <MetricCard
        data={metrics.CLS}
        icon={Activity}
        label="Cumulative Layout Shift"
        name="CLS"
      />
    </div>
  );
}

// Core vitals grid component
function CoreVitalsGrid({ metrics }: { metrics: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        data={metrics.LCP}
        icon={Clock}
        label="Largest Contentful Paint"
        name="LCP"
      />
      <MetricCard
        data={metrics.INP}
        icon={Zap}
        label="Interaction to Next Paint"
        name="INP"
      />
      <MetricCard
        data={metrics.CLS}
        icon={Activity}
        label="Cumulative Layout Shift"
        name="CLS"
      />
      <MetricCard
        data={metrics.FCP}
        icon={Clock}
        label="First Contentful Paint"
        name="FCP"
      />
      <MetricCard
        data={metrics.TTFB}
        icon={Activity}
        label="Time to First Byte"
        name="TTFB"
      />
    </div>
  );
}

export function PerformanceDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const { data, loading, fetchData } = usePerformanceData(timeRange);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <EmptyState onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        onRefresh={fetchData}
        setTimeRange={setTimeRange}
        timeRange={timeRange}
      />

      <AlertsSection metrics={data.metrics} />

      <Tabs className="space-y-4" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core-vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="overview">
          <MetricsGrid metrics={data.metrics} />
          <PagePerformanceTable pages={data.pages} />
        </TabsContent>

        <TabsContent className="space-y-4" value="core-vitals">
          <CoreVitalsGrid metrics={data.metrics} />
        </TabsContent>

        <TabsContent className="space-y-4" value="pages">
          <PagePerformanceTable pages={data.pages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
