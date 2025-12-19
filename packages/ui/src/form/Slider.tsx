/**
 * Slider component
 */
import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { clsx } from 'clsx';
import './Slider.css';

export interface SliderProps {
    /** Current value */
    value?: number[];
    /** Default value (uncontrolled) */
    defaultValue?: number[];
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Disabled state */
    disabled?: boolean;
    /** Change handler */
    onValueChange?: (value: number[]) => void;
    /** Change complete handler (on release) */
    onValueCommit?: (value: number[]) => void;
    /** Additional class name */
    className?: string;
}

export function Slider({
    value,
    defaultValue = [50],
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    onValueChange,
    onValueCommit,
    className,
}: SliderProps) {
    return (
        <SliderPrimitive.Root
            className={clsx('lui-slider', className)}
            value={value}
            defaultValue={defaultValue}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onValueChange={onValueChange}
            onValueCommit={onValueCommit}
        >
            <SliderPrimitive.Track className="lui-slider-track">
                <SliderPrimitive.Range className="lui-slider-range" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="lui-slider-thumb" />
        </SliderPrimitive.Root>
    );
}
