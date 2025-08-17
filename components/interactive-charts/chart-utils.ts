export const CHART_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
];

export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};
