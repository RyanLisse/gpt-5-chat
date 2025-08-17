# Bundle Analysis Guide

This project includes comprehensive bundle analysis tools to monitor and optimize
your Next.js application's bundle size.

## Available Scripts

### Development Analysis

```bash
# Full bundle analysis - opens interactive analyzer
bun run analyze

# Server-side bundle analysis only
bun run analyze:server

# Client-side bundle analysis only
bun run analyze:browser

# Both server and client analysis (static reports)
bun run analyze:both
```

## How It Works

### Configuration

The bundle analyzer is configured in `next.config.ts` using:

- `@next/bundle-analyzer` for interactive analysis
- `webpack-bundle-analyzer` for static reports
- Environment variables to control analysis behavior

### Environment Variables

- `ANALYZE=true` - Enables interactive bundle analyzer
- `BUNDLE_ANALYZE=server|browser|both` - Generates static reports

### Output Locations

- Interactive analysis opens in your default browser
- Static reports are saved to `analyze/` directory:
  - `analyze/client.html` - Client-side bundle
  - `analyze/server.html` - Server-side bundle

## Usage Workflow

### 1. Regular Development

```bash
# Check bundle size during development
bun run analyze
```

This opens an interactive treemap visualization showing:

- Bundle composition by module
- Gzipped vs uncompressed sizes
- Import paths and dependencies

### 2. CI/CD Integration

The project includes automated bundle analysis via GitHub Actions:

- Runs on every PR and push to main
- Compares bundle sizes between branches
- Posts size changes as PR comments
- Uploads analysis reports as artifacts

### 3. Performance Monitoring

```bash
# Generate reports for specific analysis
bun run analyze:both
```

Then open `analyze/client.html` or `analyze/server.html` to:

- Identify large dependencies
- Find duplicate modules
- Analyze code splitting effectiveness

## Understanding Bundle Analysis

### Key Metrics to Monitor

1. **Total Bundle Size**: Overall application size
2. **Chunk Sizes**: Individual route/page sizes
3. **Vendor Bundle**: Third-party dependencies
4. **Common Chunks**: Shared code between pages

### Red Flags

- Large unexpected dependencies
- Duplicate modules across chunks
- Missing code splitting for heavy components
- Unused dependencies in final bundle

### Optimization Strategies

1. **Code Splitting**: Use dynamic imports for heavy components
2. **Tree Shaking**: Ensure imports are ES6 modules
3. **Bundle Analysis**: Regular monitoring of size changes
4. **Dependency Auditing**: Remove unused packages

## CI Integration Details

### GitHub Workflow

The `.github/workflows/bundle-analysis.yml` workflow:

1. Builds the application with bundle analysis
2. Uploads analysis reports as artifacts
3. Comments on PRs with size changes
4. Tracks bundle size over time

### Bundle Size Tracking

- Uses `preactjs/compressed-size-action` for PR comments
- Monitors `.next/static/**/*.{js,css}` files
- Shows size changes with gzip compression
- Fails CI if bundle size increases significantly

## Troubleshooting

### Common Issues

1. **Analysis not generating**: Check environment variables
2. **Missing reports**: Ensure `analyze/` directory exists
3. **CI failures**: Verify GitHub Actions permissions

### Debug Steps

```bash
# Verify configuration
bun run build
ls -la analyze/

# Check environment
echo $ANALYZE
echo $BUNDLE_ANALYZE

# Manual webpack analysis
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

## Best Practices

### Regular Monitoring

- Run analysis before major releases
- Monitor bundle size in PR reviews
- Set up alerts for significant size increases

### Team Workflow

1. Analyze bundles during feature development
2. Review bundle changes in code reviews
3. Document optimization decisions
4. Track performance metrics over time

### Performance Budget

Consider setting up bundle size budgets:

- Main bundle < 250KB gzipped
- Individual pages < 100KB gzipped
- Vendor bundle < 500KB gzipped

## Advanced Usage

### Custom Analysis

```javascript
// Custom webpack configuration in next.config.ts
webpack: (config, { isServer }) => {
  if (process.env.CUSTOM_ANALYZE) {
    // Add custom bundle analyzer configuration
  }
  return config;
}
```

### Integration with Other Tools

- Lighthouse CI for performance monitoring
- Bundle size tracking in analytics
- Performance regression detection

## Resources

- [Next.js Bundle Analyzer Documentation](https://nextjs.org/docs/advanced-features/analyzing-bundles)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Web Performance Best Practices](https://web.dev/performance/)
