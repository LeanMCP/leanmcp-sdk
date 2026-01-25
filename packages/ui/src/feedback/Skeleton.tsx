/**
 * Skeleton component - Loading placeholder
 */
import React from 'react';
import { clsx } from 'clsx';
import './Skeleton.css';

export interface SkeletonProps {
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Circle shape */
  circle?: boolean;
  /** Additional class name */
  className?: string;
}

export function Skeleton({ width, height, circle = false, className }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (circle && !height && width) {
    style.height = style.width;
  }

  return (
    <div
      className={clsx('lui-skeleton', circle && 'lui-skeleton--circle', className)}
      style={style}
      aria-hidden="true"
    />
  );
}
