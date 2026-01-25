import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Left icon or element */
  leftElement?: ReactNode;
  /** Right icon or element */
  rightElement?: ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

/**
 * Input component with label, validation, and icon support
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error={errors.email}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      size = 'md',
      leftElement,
      rightElement,
      fullWidth = false,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);

    return (
      <div
        className={clsx(
          'lui-input-wrapper',
          fullWidth && 'lui-input-wrapper--full-width',
          className
        )}
      >
        {label && (
          <label htmlFor={inputId} className="lui-input-label">
            {label}
          </label>
        )}
        <div
          className={clsx(
            'lui-input-container',
            `lui-input-container--${size}`,
            hasError && 'lui-input-container--error',
            leftElement && 'lui-input-container--has-left',
            rightElement && 'lui-input-container--has-right'
          )}
        >
          {leftElement && (
            <span className="lui-input-element lui-input-element--left">{leftElement}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className="lui-input"
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightElement && (
            <span className="lui-input-element lui-input-element--right">{rightElement}</span>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={clsx('lui-input-message', error && 'lui-input-message--error')}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
