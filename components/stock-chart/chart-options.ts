import type { EChartsOption } from 'echarts-for-react/lib/types';
import { getDateFormat, type StockInterval } from './stock-chart-utils';
import { createTooltipFormatter } from './tooltip-formatter';
import type { ProcessedStockData } from './use-stock-chart-data';

export type ChartTheme = {
  textColor: string;
  gridColor: string;
  tooltipBg: string;
  isDark: boolean;
};

export const createChartOptions = (
  processedData: ProcessedStockData[],
  interval: StockInterval,
  theme: ChartTheme,
): EChartsOption => {
  return {
    backgroundColor: 'transparent',
    grid: createGridConfig(),
    tooltip: createTooltipConfig(processedData, interval, theme),
    xAxis: createXAxisConfig(interval, theme),
    yAxis: createYAxisConfig(theme),
    series: createSeriesConfig(processedData, theme),
  };
};

const createGridConfig = () => ({
  top: 20,
  right: 35,
  bottom: 25,
  left: 8,
  containLabel: true,
});

const createTooltipConfig = (
  processedData: ProcessedStockData[],
  interval: StockInterval,
  theme: ChartTheme,
) => ({
  trigger: 'axis' as const,
  borderWidth: 0,
  backgroundColor: theme.tooltipBg,
  padding: 0,
  className: 'echarts-tooltip',
  textStyle: { color: theme.textColor },
  formatter: createTooltipFormatter(
    interval,
    processedData,
    theme.isDark ? 'dark' : 'light',
    theme.tooltipBg,
    theme.textColor,
  ),
});

const createXAxisConfig = (interval: StockInterval, theme: ChartTheme) => ({
  type: 'time' as const,
  axisLine: {
    show: true,
    lineStyle: { color: theme.gridColor },
  },
  axisTick: { show: false },
  axisLabel: {
    color: theme.textColor,
    formatter: (value: number) => {
      const date = new Date(value);
      return getDateFormat(interval, date);
    },
    margin: 8,
    fontSize: 11,
    hideOverlap: true,
    interval: interval === '1d' ? 3 : ('auto' as const),
    rotate: interval === '1d' ? 45 : 0,
    padding: [4, 0] as [number, number],
    align: 'center' as const,
  },
  splitLine: { show: false },
});

const createYAxisConfig = (theme: ChartTheme) => ({
  type: 'value' as const,
  position: 'right' as const,
  axisLine: {
    show: true,
    lineStyle: { color: theme.gridColor },
  },
  axisTick: { show: false },
  axisLabel: {
    formatter: (value: number) => `$${value.toFixed(0)}`,
    color: theme.textColor,
    margin: 8,
    padding: [0, 0, 0, 0] as [number, number, number, number],
  },
  splitLine: { show: false },
  min: (value: { min: number; max: number }) => {
    const range = value.max - value.min;
    return value.min - range * 0.05;
  },
  max: (value: { min: number; max: number }) => {
    const range = value.max - value.min;
    return value.max + range * 0.05;
  },
});

const createSeriesConfig = (
  processedData: ProcessedStockData[],
  theme: ChartTheme,
) => {
  return processedData.map((series) => ({
    name: series.label,
    type: 'line' as const,
    smooth: true,
    showSymbol: false,
    data: series.points.map((point) => [point.date.getTime(), point.value]),
    lineStyle: {
      color: series.color.line,
      width: 2,
    },
    areaStyle: {
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          {
            offset: 0,
            color: series.color.area,
          },
          {
            offset: 1,
            color: theme.isDark
              ? 'rgba(23, 23, 23, 0)'
              : 'rgba(255, 255, 255, 0)',
          },
        ],
      },
    },
  }));
};
