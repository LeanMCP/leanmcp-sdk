/**
 * Progress component - Loading indicator
 */
import React from 'react';
import { clsx } from 'clsx';
import './Progress.css';

export interface ProgressProps {
  /** Progress value (0-100) */
  value?: number;
  /** Indeterminate mode */
  indeterminate?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
}

export function Progress({
  value = 0,
  indeterminate = false,
  size = 'md',
  className,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={clsx('lui-progress', `lui-progress--${size}`, className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx('lui-progress-bar', indeterminate && 'lui-progress-bar--indeterminate')}
        style={indeterminate ? undefined : { width: `${clampedValue}%` }}
      />
    </div>
  );
}
