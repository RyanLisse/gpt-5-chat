import { useTheme } from 'next-themes';

export type ChartThemeConfig = {
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  isDark: boolean;
};

export const useInteractiveChartTheme = (): ChartThemeConfig => {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  // NOTE: Currently hardcoded to dark theme values for consistency
  return {
    textColor: '#e5e5e5',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    tooltipBg: '#171717',
    isDark,
  };
};
