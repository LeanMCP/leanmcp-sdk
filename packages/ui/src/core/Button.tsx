import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
    /** Button size */
    size?: 'sm' | 'md' | 'lg' | 'icon';
    /** Loading state */
    loading?: boolean;
    /** Render as child component (Radix Slot) */
    asChild?: boolean;
    /** Left icon */
    leftIcon?: ReactNode;
    /** Right icon */
    rightIcon?: ReactNode;
}

/**
 * Button component with multiple variants and loading state
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 * 
 * <Button variant="ghost" loading>
 *   Loading...
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            loading = false,
            disabled,
            asChild = false,
            leftIcon,
            rightIcon,
            children,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : 'button';

        return (
            <Comp
                ref={ref}
                className={clsx(
                    'lui-button',
                    `lui-button--${variant}`,
                    `lui-button--${size}`,
                    loading && 'lui-button--loading',
                    className
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <span className="lui-button__spinner" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" className="lui-spinner-icon">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="32"
                                strokeDashoffset="12"
                            />
                        </svg>
                    </span>
                )}
                {leftIcon && !loading && <span className="lui-button__icon">{leftIcon}</span>}
                <span className="lui-button__content">{children}</span>
                {rightIcon && <span className="lui-button__icon">{rightIcon}</span>}
            </Comp>
        );
    }
);

Button.displayName = 'Button';
