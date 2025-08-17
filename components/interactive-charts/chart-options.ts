import type { EChartsOption } from 'echarts-for-react/lib/types';
import type { BaseChart } from '../interactive-charts';
import { chartTypeStrategies } from './chart-configs';
import type { ChartThemeConfig } from './use-chart-theme';

export const createSharedOptions = (
  theme: ChartThemeConfig,
): Partial<EChartsOption> => ({
  backgroundColor: 'transparent',
  grid: {
    top: 50,
    right: 32,
    bottom: 32,
    left: 32,
    containLabel: true,
  },
  legend: {
    textStyle: { color: theme.textColor },
    top: 8,
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 16,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: theme.tooltipBg,
    borderWidth: 0,
    padding: [6, 10],
    className:
      'echarts-tooltip rounded-lg! border! border-neutral-200! dark:border-neutral-800!',
    textStyle: {
      color: theme.textColor,
      fontSize: 13,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
  },
});

export const createAxisOptions = (theme: ChartThemeConfig) => ({
  axisLine: { show: true, lineStyle: { color: theme.gridColor } },
  axisTick: { show: false },
  axisLabel: {
    color: theme.textColor,
    margin: 8,
    fontSize: 11,
    hideOverlap: true,
  },
  nameTextStyle: {
    color: theme.textColor,
    fontSize: 13,
    padding: [0, 0, 0, 0] as [number, number, number, number],
  },
  splitLine: {
    show: true,
    lineStyle: { color: theme.gridColor, type: 'dashed' as const },
  },
});

export const createDateFormatter = (value: number): string => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

export const createChartOptions = (
  chart: BaseChart,
  theme: ChartThemeConfig,
): EChartsOption => {
  const sharedOptions = createSharedOptions(theme);
  const defaultAxisOptions = createAxisOptions(theme);

  const getConfig =
    chartTypeStrategies[chart.type as keyof typeof chartTypeStrategies];
  if (!getConfig) {
    return sharedOptions as EChartsOption;
  }

  const { series, axisType } = getConfig(chart);
  const isTimeAxis = chart.x_scale === 'datetime' && axisType === 'value';

  return {
    ...sharedOptions,
    xAxis: {
      type: isTimeAxis ? 'time' : axisType,
      name: chart.x_label,
      nameLocation: 'middle',
      nameGap: 40,
      scale: axisType === 'value',
      ...defaultAxisOptions,
      axisLabel: {
        ...defaultAxisOptions.axisLabel,
        formatter: isTimeAxis ? createDateFormatter : undefined,
      },
    },
    yAxis: {
      type: 'value',
      name: chart.y_label,
      nameLocation: 'middle',
      nameGap: 50,
      position: 'right',
      scale: true,
      ...defaultAxisOptions,
    },
    series,
  } as EChartsOption;
};
