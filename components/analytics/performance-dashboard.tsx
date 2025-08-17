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
                      className={
                        getPerformanceRating('LCP', page.avgLCP) === 'good'
                          ? 'text-green-600'
                          : getPerformanceRating('LCP', page.avgLCP) ===
                              'needs-improvement'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }
                    >
                      {formatMetricValue('LCP', page.avgLCP)}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={
                        getPerformanceRating('INP', page.avgINP) === 'good'
                          ? 'text-green-600'
                          : getPerformanceRating('INP', page.avgINP) ===
                              'needs-improvement'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }
                    >
                      {formatMetricValue('INP', page.avgINP)}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={
                        getPerformanceRating('CLS', page.avgCLS) === 'good'
                          ? 'text-green-600'
                          : getPerformanceRating('CLS', page.avgCLS) ===
                              'needs-improvement'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }
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

export function PerformanceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center">
        <p>No performance data available</p>
        <Button className="mt-4" onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl tracking-tight">
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Core Web Vitals and performance metrics for the last {timeRange}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setTimeRange('1h')}
            size="sm"
            variant={timeRange === '1h' ? 'default' : 'outline'}
          >
            1h
          </Button>
          <Button
            onClick={() => setTimeRange('24h')}
            size="sm"
            variant={timeRange === '24h' ? 'default' : 'outline'}
          >
            24h
          </Button>
          <Button
            onClick={() => setTimeRange('7d')}
            size="sm"
            variant={timeRange === '7d' ? 'default' : 'outline'}
          >
            7d
          </Button>
          <Button
            onClick={() => setTimeRange('30d')}
            size="sm"
            variant={timeRange === '30d' ? 'default' : 'outline'}
          >
            30d
          </Button>
          <Button onClick={fetchData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertsSection metrics={data.metrics} />

      <Tabs className="space-y-4" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core-vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              data={data.metrics.LCP}
              icon={Clock}
              label="Largest Contentful Paint"
              name="LCP"
            />
            <MetricCard
              data={data.metrics.INP}
              icon={Zap}
              label="Interaction to Next Paint"
              name="INP"
            />
            <MetricCard
              data={data.metrics.CLS}
              icon={Activity}
              label="Cumulative Layout Shift"
              name="CLS"
            />
          </div>
          <PagePerformanceTable pages={data.pages} />
        </TabsContent>

        <TabsContent className="space-y-4" value="core-vitals">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              data={data.metrics.LCP}
              icon={Clock}
              label="Largest Contentful Paint"
              name="LCP"
            />
            <MetricCard
              data={data.metrics.INP}
              icon={Zap}
              label="Interaction to Next Paint"
              name="INP"
            />
            <MetricCard
              data={data.metrics.INP}
              icon={Zap}
              label="Interaction to Next Paint"
              name="INP"
            />
            <MetricCard
              data={data.metrics.CLS}
              icon={Activity}
              label="Cumulative Layout Shift"
              name="CLS"
            />
            <MetricCard
              data={data.metrics.FCP}
              icon={Clock}
              label="First Contentful Paint"
              name="FCP"
            />
            <MetricCard
              data={data.metrics.TTFB}
              icon={Activity}
              label="Time to First Byte"
              name="TTFB"
            />
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="pages">
          <PagePerformanceTable pages={data.pages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
