import ReactECharts from 'echarts-for-react/lib/index';
import { motion } from 'motion/react';
import React from 'react';
import { Card } from '@/components/ui/card';
import { createChartOptions } from './interactive-charts/chart-options';
import { useInteractiveChartTheme } from './interactive-charts/use-chart-theme';

export type BaseChart = {
  type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  elements: any[];
  x_scale?: string;
};

export function InteractiveChart({ chart }: { chart: BaseChart }) {
  const chartTheme = useInteractiveChartTheme();
  const options = createChartOptions(chart, chartTheme);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="p-6">
          {chart.title && (
            <h3 className="mb-4 font-medium text-lg text-neutral-900 dark:text-neutral-100">
              {chart.title}
            </h3>
          )}
          <ReactECharts
            notMerge={true}
            option={options}
            style={{ height: '400px', width: '100%' }}
            theme={chartTheme.isDark ? 'dark' : undefined}
          />
        </div>
      </Card>
    </motion.div>
  );
}

export default InteractiveChart;
