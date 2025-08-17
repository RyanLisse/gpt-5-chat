import { getDateFormat, type StockInterval } from './stock-chart-utils';
import type { ProcessedStockData } from './use-stock-chart-data';

export const createTooltipFormatter = (
  interval: StockInterval,
  processedData: ProcessedStockData[],
  theme: string | undefined,
  tooltipBg: string,
  textColor: string,
) => {
  return (params: any[]) => {
    if (!Array.isArray(params) || params.length === 0) {
      return '';
    }

    const date = new Date(params[0].value[0]);
    const formattedDate = getDateFormat(interval, date);

    let tooltipHtml = createTooltipHeader(
      formattedDate,
      theme,
      tooltipBg,
      textColor,
    );

    params.forEach((param) => {
      if (!param.value || param.value.length < 2) {
        return;
      }

      const tooltipItem = createTooltipItem(param, processedData, theme);
      tooltipHtml += tooltipItem;
    });

    tooltipHtml += `</div>`;
    return tooltipHtml;
  };
};

const createTooltipHeader = (
  formattedDate: string,
  theme: string | undefined,
  tooltipBg: string,
  _textColor: string,
) => {
  return `
    <div style="
      padding: 6px 10px;
      border-radius: 5px;
      border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
      font-family: system-ui, -apple-system, sans-serif;
      background: ${tooltipBg};
    ">
      <div style="font-size: 13px; color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};">
        ${formattedDate}
      </div>
  `;
};

const createTooltipItem = (
  param: any,
  processedData: ProcessedStockData[],
  theme: string | undefined,
) => {
  const currentPrice = param.value[1];
  const seriesName = param.seriesName;
  const series = processedData.find((d) => d.label === seriesName);
  const lineColor = series?.color.line || '#888';

  const { change, changePercent } = calculatePriceChange(param, series);
  const isPositive = change >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';

  return `
    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: ${lineColor};
        shrink: 0;
      "></div>
      <span style="
        font-size: 13px;
        font-weight: 500;
        color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
      ">${seriesName}: $${currentPrice.toFixed(2)}</span>
      ${createChangeIndicator(param.dataIndex, isPositive, changeColor, changePercent)}
    </div>
  `;
};

const calculatePriceChange = (
  param: any,
  series: ProcessedStockData | undefined,
) => {
  const currentPrice = param.value[1];
  const dataIndex = param.dataIndex;
  let change = 0;
  let changePercent = 0;

  if (dataIndex > 0) {
    const prevPoint = series?.points[dataIndex - 1];
    if (prevPoint) {
      const prevPrice = prevPoint.value;
      change = currentPrice - prevPrice;
      changePercent = (change / prevPrice) * 100;
    }
  }

  return { change, changePercent };
};

const createChangeIndicator = (
  dataIndex: number,
  isPositive: boolean,
  changeColor: string,
  changePercent: number,
) => {
  if (dataIndex === 0) {
    return '';
  }

  return `
    <span style="
      font-size: 13px;
      font-weight: 500;
      color: ${changeColor};
      display: flex;
      align-items: center;
      gap: 2px;
    ">${isPositive ? '↑' : '↓'}${Math.abs(changePercent).toFixed(2)}%</span>
  `;
};
