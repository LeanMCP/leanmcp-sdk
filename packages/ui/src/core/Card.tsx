import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Card variant */
    variant?: 'default' | 'outline' | 'elevated';
    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Make card interactive (hover effects) */
    interactive?: boolean;
}

/**
 * Card container component
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant = 'default',
            padding = 'md',
            interactive = false,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={clsx(
                    'lui-card',
                    `lui-card--${variant}`,
                    `lui-card--padding-${padding}`,
                    interactive && 'lui-card--interactive',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    /** Header title */
    title?: ReactNode;
    /** Header description */
    description?: ReactNode;
    /** Right-side action */
    action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, title, description, action, children, ...props }, ref) => {
        return (
            <div ref={ref} className={clsx('lui-card-header', className)} {...props}>
                {(title || description) && (
                    <div className="lui-card-header__text">
                        {title && <h3 className="lui-card-header__title">{title}</h3>}
                        {description && <p className="lui-card-header__description">{description}</p>}
                    </div>
                )}
                {action && <div className="lui-card-header__action">{action}</div>}
                {children}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> { }

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={clsx('lui-card-content', className)} {...props}>
                {children}
            </div>
        );
    }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> { }

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={clsx('lui-card-footer', className)} {...props}>
                {children}
            </div>
        );
    }
);

CardFooter.displayName = 'CardFooter';
