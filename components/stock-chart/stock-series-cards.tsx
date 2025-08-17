import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProcessedStockData } from './use-stock-chart-data';

type StockSeriesCardsProps = {
  processedData: ProcessedStockData[];
  theme: string | undefined;
};

export function StockSeriesCards({
  processedData,
  theme,
}: StockSeriesCardsProps) {
  return (
    <div className="mb-2 grid grid-cols-1 gap-2 px-2 sm:mb-4 sm:gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {processedData.map((series) => (
        <StockSeriesCard key={series.label} series={series} theme={theme} />
      ))}
    </div>
  );
}

type StockSeriesCardProps = {
  series: ProcessedStockData;
  theme: string | undefined;
};

function StockSeriesCard({ series, theme }: StockSeriesCardProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg p-2 sm:p-3"
      style={{
        backgroundColor:
          theme === 'dark'
            ? `${series.color.line}15`
            : `${series.color.line}40`,
      }}
    >
      <div className="truncate text-neutral-600 text-xs sm:text-sm dark:text-neutral-400">
        {series.label}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-base text-neutral-900 sm:text-lg dark:text-neutral-100">
          ${series.lastPrice.toFixed(2)}
        </span>
        <PriceChangeBadge
          percentChange={series.percentChange}
          priceChange={series.priceChange}
        />
      </div>
    </div>
  );
}

type PriceChangeBadgeProps = {
  priceChange: number;
  percentChange: string;
};

function PriceChangeBadge({
  priceChange,
  percentChange,
}: PriceChangeBadgeProps) {
  const isPositive = priceChange >= 0;

  return (
    <Badge
      className={cn(
        'whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] leading-none',
        isPositive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      )}
    >
      <span className="inline-flex items-center">
        {isPositive ? '↑' : '↓'}
        <span className="ml-0.5">
          {Math.abs(priceChange).toFixed(2)} ({percentChange}%)
        </span>
      </span>
    </Badge>
  );
}
