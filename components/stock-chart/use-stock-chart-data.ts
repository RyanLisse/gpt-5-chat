import { useMemo } from 'react';
import { formatStockSymbol, getSeriesColor } from './stock-chart-utils';

export type ChartElement = {
  label: string;
  points: [string, number][];
};

export type ProcessedStockData = {
  label: string;
  points: Array<{
    date: Date;
    value: number;
    label: string;
  }>;
  firstPrice: number;
  lastPrice: number;
  priceChange: number;
  percentChange: string;
  color: {
    line: string;
    area: string;
  };
};

export const useStockChartData = (
  chartElements: ChartElement[],
  stockSymbols: string[],
) => {
  return useMemo(() => {
    return chartElements.map((element, index) => {
      const points = element.points
        .map(([dateStr, price]) => {
          const date = new Date(dateStr);
          return {
            date,
            value: Number(price),
            label: stockSymbols[index],
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const firstPrice = points[0]?.value || 0;
      const lastPrice = points.at(-1)?.value || 0;
      const priceChange = lastPrice - firstPrice;
      const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);

      const seriesColor = getSeriesColor(index);

      return {
        label: formatStockSymbol(stockSymbols[index]),
        points,
        firstPrice,
        lastPrice,
        priceChange,
        percentChange,
        color: seriesColor,
      };
    });
  }, [chartElements, stockSymbols]);
};
