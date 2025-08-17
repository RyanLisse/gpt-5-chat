import type { BaseChart } from '../interactive-charts';
import { getChartColor } from './chart-utils';

export type ChartConfig = {
  series: any[];
  axisType: 'value' | 'category';
};

export const getLineOrScatterConfig = (chart: BaseChart): ChartConfig => {
  const series = chart.elements.map((e, index) => ({
    name: e.label,
    type: chart.type,
    data: e.points.map((p: [number | string, number]) => {
      // Handle datetime x-axis
      const x = chart.x_scale === 'datetime' ? new Date(p[0]).getTime() : p[0];
      return [x, p[1]];
    }),
    smooth: true,
    symbolSize: chart.type === 'scatter' ? 10 : 0,
    lineStyle: {
      width: 2,
      color: getChartColor(index),
    },
    itemStyle: {
      color: getChartColor(index),
    },
    areaStyle: chart.type === 'line' ? createAreaStyle(index) : undefined,
  }));

  return { series, axisType: 'value' };
};

export const getBarConfig = (chart: BaseChart): ChartConfig => {
  const data = chart.elements.reduce((acc: Record<string, any[]>, item) => {
    const key = item.group;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const series = Object.entries(data).map(([group, elements], index) => ({
    name: group,
    type: 'bar',
    stack: 'total',
    data: elements?.map((e) => [e.label, e.value]),
    itemStyle: {
      color: getChartColor(index),
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)',
      },
    },
  }));

  return { series, axisType: 'category' };
};

const createAreaStyle = (index: number) => ({
  color: {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      {
        offset: 0,
        color: `${getChartColor(index)}15`,
      },
      {
        offset: 1,
        color: 'rgba(23, 23, 23, 0)',
      },
    ],
  },
});

export const chartTypeStrategies = {
  line: getLineOrScatterConfig,
  scatter: getLineOrScatterConfig,
  bar: getBarConfig,
} as const;
