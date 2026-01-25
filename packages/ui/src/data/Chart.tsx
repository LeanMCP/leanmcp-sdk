import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type ChartType as ChartJSType,
} from 'chart.js';
import { Chart as ReactChart } from 'react-chartjs-2';
import { clsx } from 'clsx';
import './Chart.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

export interface ChartProps {
  /** Chart type */
  type: ChartType;
  /** Chart data */
  data: ChartData<ChartJSType>;
  /** Chart options */
  options?: ChartOptions<ChartJSType>;
  /** Chart height */
  height?: number | string;
  /** Chart width */
  width?: number | string;
  /** Additional class name */
  className?: string;
}

/**
 * Chart component for data visualization
 *
 * @example
 * ```tsx
 * const { result } = useTool<{ prices: number[], labels: string[] }>('get-stock-data');
 *
 * <Chart
 *   type="line"
 *   data={{
 *     labels: result?.labels ?? [],
 *     datasets: [{
 *       label: 'Price',
 *       data: result?.prices ?? [],
 *       borderColor: '#6366f1',
 *       tension: 0.4,
 *     }],
 *   }}
 *   height={300}
 * />
 * ```
 */
export function Chart({
  type,
  data,
  options,
  height = 300,
  width = '100%',
  className,
}: ChartProps) {
  const defaultOptions: ChartOptions<ChartJSType> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales:
      type !== 'pie' && type !== 'doughnut'
        ? {
            x: {
              grid: {
                color: 'rgba(226, 232, 240, 0.5)',
              },
              ticks: {
                color: '#64748b',
              },
            },
            y: {
              grid: {
                color: 'rgba(226, 232, 240, 0.5)',
              },
              ticks: {
                color: '#64748b',
              },
            },
          }
        : undefined,
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
  };

  return (
    <div className={clsx('lui-chart', className)} style={{ height, width }}>
      <ReactChart type={type} data={data} options={mergedOptions as ChartOptions<ChartJSType>} />
    </div>
  );
}
