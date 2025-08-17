import ReactECharts from 'echarts-for-react/lib/index';
import React from 'react';
import { createChartOptions } from './stock-chart/chart-options';
import type { StockInterval } from './stock-chart/stock-chart-utils';
import { StockSeriesCards } from './stock-chart/stock-series-cards';
import { useChartTheme } from './stock-chart/use-chart-theme';
import { useStockChartData } from './stock-chart/use-stock-chart-data';

export type StockChartProps = {
  title: string;
  stock_symbols: string[];
  interval: StockInterval;
  chart: {
    type: string;
    x_label: string;
    y_label: string;
    x_scale: string;
    x_ticks?: string[];
    x_tick_labels?: string[];
    elements: Array<{ label: string; points: [string, number][] }>;
  };
  data?: Array<{ label: string; points: [string, number][] }>;
};

export function InteractiveStockChart({
  title,
  stock_symbols,
  interval,
  chart,
  data: _data,
}: StockChartProps) {
  const chartTheme = useChartTheme();
  const processedData = useStockChartData(chart.elements, stock_symbols);
  const options = createChartOptions(processedData, interval, chartTheme);

  return (
    <div className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-900">
      <div className="p-2 sm:p-4">
        <h3 className="mb-2 px-2 font-bold text-base text-neutral-800 sm:mb-4 sm:text-lg lg:text-xl dark:text-neutral-200">
          {title}
        </h3>

        <StockSeriesCards
          processedData={processedData}
          theme={chartTheme.isDark ? 'dark' : 'light'}
        />

        <div className="overflow-hidden rounded-lg">
          <ReactECharts
            notMerge={true}
            option={options}
            style={{
              height: window.innerWidth < 640 ? '250px' : '400px',
              width: '100%',
            }}
            theme={chartTheme.isDark ? 'dark' : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default InteractiveStockChart;
