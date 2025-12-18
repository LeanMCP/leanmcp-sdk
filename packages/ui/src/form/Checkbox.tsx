/**
 * Checkbox component
 */
import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { clsx } from 'clsx';
import './Checkbox.css';

export interface CheckboxProps {
    /** Checked state */
    checked?: boolean;
    /** Default checked (uncontrolled) */
    defaultChecked?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Change handler */
    onCheckedChange?: (checked: boolean) => void;
    /** Label text */
    label?: string;
    /** Additional class name */
    className?: string;
    /** ID for label association */
    id?: string;
}

export function Checkbox({
    checked,
    defaultChecked,
    disabled = false,
    onCheckedChange,
    label,
    className,
    id,
}: CheckboxProps) {
    const checkboxId = id || React.useId();

    return (
        <div className={clsx('lui-checkbox-wrapper', className)}>
            <CheckboxPrimitive.Root
                id={checkboxId}
                checked={checked}
                defaultChecked={defaultChecked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
                className="lui-checkbox"
            >
                <CheckboxPrimitive.Indicator className="lui-checkbox-indicator">
                    <CheckIcon />
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            {label && (
                <label htmlFor={checkboxId} className="lui-checkbox-label">
                    {label}
                </label>
            )}
        </div>
    );
}

function CheckIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
