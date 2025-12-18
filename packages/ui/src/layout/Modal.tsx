/**
 * Modal component
 */
import React, { type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import './Modal.css';

export interface ModalProps {
    /** Open state */
    open?: boolean;
    /** Default open (uncontrolled) */
    defaultOpen?: boolean;
    /** Change handler */
    onOpenChange?: (open: boolean) => void;
    /** Modal title */
    title?: string;
    /** Modal description */
    description?: string;
    /** Children content */
    children?: ReactNode;
    /** Additional class name */
    className?: string;
    /** Trigger element */
    trigger?: ReactNode;
}

export function Modal({
    open,
    defaultOpen,
    onOpenChange,
    title,
    description,
    children,
    className,
    trigger,
}: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
            {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="lui-modal-overlay" />
                <DialogPrimitive.Content className={clsx('lui-modal-content', className)}>
                    {title && (
                        <DialogPrimitive.Title className="lui-modal-title">
                            {title}
                        </DialogPrimitive.Title>
                    )}
                    {description && (
                        <DialogPrimitive.Description className="lui-modal-description">
                            {description}
                        </DialogPrimitive.Description>
                    )}
                    {children}
                    <DialogPrimitive.Close className="lui-modal-close" aria-label="Close">
                        <CloseIcon />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function CloseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
