# Performance Monitoring System

This application includes a comprehensive performance monitoring system that tracks
Core Web Vitals, server performance, bundle sizes, and provides actionable
insights for optimization.

## Features

### 🔍 Core Web Vitals Tracking

- **Real User Monitoring (RUM)** for all Core Web Vitals metrics
- **LCP** (Largest Contentful Paint) - measures loading performance
- **FID** (First Input Delay) - measures interactivity
- **INP** (Interaction to Next Paint) - measures responsiveness
- **CLS** (Cumulative Layout Shift) - measures visual stability
- **FCP** (First Contentful Paint) - measures perceived loading speed
- **TTFB** (Time to First Byte) - measures server response time

### 📊 Performance Dashboard

- Interactive dashboard showing real-time metrics
- Performance trends and historical data
- Page-specific performance breakdown
- Visual indicators for performance ratings (good/needs improvement/poor)

### 💰 Performance Budgets & Alerts

- Configurable performance budgets for each metric
- Multi-level alerting (warning/error/critical)
- Real-time budget violation notifications
- Console and webhook notification channels

### 🚀 Server-Side Monitoring

- API response time tracking
- Database query performance monitoring
- Memory usage analysis
- Error rate monitoring

### 📦 Bundle Size Analysis

- Webpack bundle analysis integration
- Bundle size budgets and tracking
- Historical bundle size comparison
- Asset-level size breakdown

### 📋 Automated Reporting

- Comprehensive performance reports
- Markdown export for documentation
- Actionable optimization recommendations
- CI/CD integration support

## Quick Start

### 1. Performance Dashboard

Visit the performance dashboard to view real-time metrics:

```typescript
import { PerformanceDashboard } from '@/components/analytics/performance-dashboard';

// Add to your admin or monitoring page
<PerformanceDashboard />
```

### 2. Run Performance Audit

```bash
# Complete performance audit
npm run perf:audit

# CI mode (exits with error on budget violations)
npm run perf:audit:ci

# Generate report only
npm run perf:report
```

### 3. View Analytics Data

```bash
# Get performance data via API
curl "http://localhost:3000/api/analytics/web-vitals?timeRange=24h"

# Download markdown report
curl "http://localhost:3000/api/analytics/performance-report?format=markdown" > report.md
```

## Configuration

### Performance Budgets

Edit budgets in `lib/performance/budgets.ts`:

```typescript
export const DEFAULT_BUDGET_CONFIG: Record<WebVitalMetric, BudgetConfig> = {
  LCP: {
    metric: 'LCP',
    warningThreshold: 10, // 10% over budget
    errorThreshold: 25,   // 25% over budget
    criticalThreshold: 50, // 50% over budget
    enabled: true,
  },
  // ... other metrics
};
```

### Bundle Size Budgets

Configure bundle budgets in `lib/performance/bundle-analysis.ts`:

```typescript
export const DEFAULT_BUNDLE_BUDGETS: BundleBudget[] = [
  {
    name: 'initial-bundle',
    type: 'initial',
    maximumWarning: 500 * 1024, // 500KB
    maximumError: 1024 * 1024,  // 1MB
  },
  // ... other budgets
];
```

### Notification Channels

Set up alerts in your application:

```typescript
import { alertNotifications } from '@/lib/performance/budgets';

// Add webhook notifications
alertNotifications.addChannel({
  type: 'webhook',
  config: {
    url: 'https://your-webhook-url.com/alerts',
    headers: { 'Authorization': 'Bearer token' }
  },
  enabled: true,
});
```

## API Endpoints

### Web Vitals Data

```http
GET  /api/analytics/web-vitals?timeRange=24h&userId=123
POST /api/analytics/web-vitals
```

### Performance Reports

```http
GET  /api/analytics/performance-report?format=json&includeBundleAnalysis=true
POST /api/analytics/performance-report
```

## Integration Examples

### Next.js Middleware

Add server-side tracking to API routes:

```typescript
import { createApiPerformanceMiddleware } from '@/lib/performance/server-monitoring';

export async function GET(request: NextRequest) {
  const trackPerformance = createApiPerformanceMiddleware();
  const perfTracker = trackPerformance(request, '/api/example');
  
  try {
    // Your API logic here
    const result = await someOperation();
    
    perfTracker.end(200);
    return NextResponse.json(result);
  } catch (error) {
    perfTracker.end(500);
    throw error;
  }
}
```

### Database Query Tracking

Decorate database operations:

```typescript
import { trackDatabaseQuery } from '@/lib/performance/server-monitoring';

class UserService {
  @trackDatabaseQuery('SELECT', 'SELECT * FROM users WHERE id = ?', 'users')
  async getUserById(id: string) {
    return await db.select().from(users).where(eq(users.id, id));
  }
}
```

### Custom Metrics

Track custom performance metrics:

```typescript
import { ServerPerformanceTracker } from '@/lib/performance/server-monitoring';

const tracker = ServerPerformanceTracker.getInstance();

// Record custom metric
tracker.recordMetric({
  name: 'custom_operation_time',
  value: 150, // milliseconds
  route: '/api/custom',
  metadata: { operationType: 'data-processing' }
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Monitoring

on: [push, pull_request]

jobs:
  performance-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and analyze
        run: npm run build
      
      - name: Performance audit
        run: npm run perf:audit:ci
      
      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: reports/performance-report-*.md
```

### Performance Monitoring in Production

1. **Real-time Alerts**: Set up webhook notifications to your monitoring system
2. **Scheduled Reports**: Generate daily/weekly performance reports
3. **Budget Enforcement**: Fail CI builds on budget violations
4. **Historical Tracking**: Store performance data for trend analysis

## Troubleshooting

### Common Issues

**Web Vitals not tracking:**

- Ensure `WebVitalsTracker` is included in your app layout
- Check browser console for errors
- Verify analytics endpoints are accessible

**Bundle analysis failing:**

- Make sure Next.js build completes successfully
- Check that webpack stats are generated
- Verify file permissions in `.next` directory

**Server metrics missing:**

- Ensure middleware is properly configured
- Check that performance tracker instances are created
- Verify API routes are using tracking middleware

### Performance Tips

1. **Optimize Images**: Use Next.js Image component with proper sizing
2. **Code Splitting**: Implement dynamic imports for large components
3. **Caching**: Use appropriate cache headers and strategies
4. **Bundle Optimization**: Regularly audit and optimize bundle sizes
5. **Database Queries**: Monitor and optimize slow queries
6. **Third-party Scripts**: Load non-critical scripts asynchronously

## Metrics Reference

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP    | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID    | ≤ 100ms | ≤ 300ms | > 300ms |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |

### Additional Metrics

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| FCP    | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB   | ≤ 800ms | ≤ 1.8s | > 1.8s |

## Contributing

When adding new performance monitoring features:

1. Update relevant TypeScript interfaces
2. Add appropriate tests
3. Update this documentation
4. Ensure backward compatibility
5. Consider privacy implications of data collection

---

For more information on web performance optimization, see:

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance](https://react.dev/learn/render-and-commit)
