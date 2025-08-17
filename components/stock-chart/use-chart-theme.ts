import { useTheme } from 'next-themes';
import type { ChartTheme } from './chart-options';

export const useChartTheme = (): ChartTheme => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    textColor: isDark ? '#e5e5e5' : '#171717',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    tooltipBg: isDark ? '#171717' : '#ffffff',
    isDark,
  };
};
