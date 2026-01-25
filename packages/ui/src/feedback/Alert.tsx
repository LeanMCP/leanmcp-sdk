/**
 * Alert component - Inline feedback messages
 */
import React, { type ReactNode } from 'react';
import { clsx } from 'clsx';
import './Alert.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  /** Alert variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Children content */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Dismiss handler (shows close button if provided) */
  onDismiss?: () => void;
}

export function Alert({ variant = 'info', title, children, className, onDismiss }: AlertProps) {
  return (
    <div className={clsx('lui-alert', `lui-alert--${variant}`, className)} role="alert">
      <div className="lui-alert-icon">
        <AlertIcon variant={variant} />
      </div>
      <div className="lui-alert-content">
        {title && <div className="lui-alert-title">{title}</div>}
        {children && <div className="lui-alert-description">{children}</div>}
      </div>
      {onDismiss && (
        <button className="lui-alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

function AlertIcon({ variant }: { variant: AlertVariant }) {
  const icons = {
    info: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7V11M8 5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    success: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 8L7 10L11 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2L14.5 13H1.5L8 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 6V9M8 11V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };
  return icons[variant];
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
