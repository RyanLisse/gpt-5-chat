export const CHART_COLORS = [
  { line: '#22c55e', area: 'rgba(34, 197, 94, 0.15)' }, // green
  { line: '#3b82f6', area: 'rgba(59, 130, 246, 0.15)' }, // blue
  { line: '#f59e0b', area: 'rgba(245, 158, 11, 0.15)' }, // amber
  { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.15)' }, // purple
  { line: '#ec4899', area: 'rgba(236, 72, 153, 0.15)' }, // pink
  { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.15)' }, // cyan
  { line: '#ef4444', area: 'rgba(239, 68, 68, 0.15)' }, // red
  { line: '#84cc16', area: 'rgba(132, 204, 22, 0.15)' }, // lime
];

export const getSeriesColor = (index: number) => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

export const formatStockSymbol = (symbol: string) => {
  // Common stock suffixes to remove
  const suffixes = ['.US', '.NYSE', '.NASDAQ'];
  let formatted = symbol;

  // Remove any known suffix
  suffixes.forEach((suffix) => {
    formatted = formatted.replace(suffix, '');
  });

  // If it's a crypto pair, format it nicely
  if (formatted.endsWith('USD')) {
    formatted = formatted.replace('USD', '');
    return `${formatted} / USD`;
  }

  return formatted;
};

export type StockInterval =
  | '1d'
  | '5d'
  | '1mo'
  | '3mo'
  | '6mo'
  | '1y'
  | '2y'
  | '5y'
  | '10y'
  | 'ytd'
  | 'max';

export const getDateFormat = (interval: StockInterval, date: Date) => {
  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    '1d': { hour: 'numeric' },
    '5d': { weekday: 'short', hour: 'numeric' },
    '1mo': { month: 'short', day: 'numeric' },
    '3mo': { month: 'short', day: 'numeric' },
    '6mo': { month: 'short', day: 'numeric' },
    '1y': { month: 'short', day: 'numeric' },
    '2y': { month: 'short', year: '2-digit' },
    '5y': { month: 'short', year: '2-digit' },
    '10y': { month: 'short', year: '2-digit' },
    ytd: { month: 'short', day: 'numeric' },
    max: { month: 'short', year: '2-digit' },
  };

  return date.toLocaleDateString('en-US', formats[interval]);
};
