/**
 * ToolSelect - Select component with MCP tool integration
 * 
 * Features:
 * - Fetch options from an MCP tool
 * - Trigger a tool call on selection
 * - Transform tool results to options
 * - Loading and empty states
 * 
 * @example Fetch options from tool
 * ```tsx
 * <ToolSelect
 *   optionsTool="list-categories"
 *   transformOptions={(result) => result.categories.map(c => ({
 *     value: c.id,
 *     label: c.name
 *   }))}
 *   placeholder="Select category"
 * />
 * ```
 * 
 * @example Call tool on selection
 * ```tsx
 * <ToolSelect
 *   options={[
 *     { value: 'asc', label: 'Ascending' },
 *     { value: 'desc', label: 'Descending' }
 *   ]}
 *   onSelectTool="set-sort-order"
 *   argName="order"
 * />
 * ```
 * 
 * @example Both: fetch options AND call on select
 * ```tsx
 * <ToolSelect
 *   optionsTool="list-projects"
 *   onSelectTool="switch-project"
 *   argName="projectId"
 * />
 * ```
 */
'use client';

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTool } from './useTool';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ToolBinding } from '@/types/mcp-types';

/**
 * Option type for ToolSelect
 */
export interface ToolSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    description?: string;
}

/**
 * ToolSelect props
 */
export interface ToolSelectProps {
    /** Tool to call when option selected */
    onSelectTool?: string | ToolBinding;
    /** Field name to pass selection value as */
    argName?: string;
    /** Additional args to pass with selection */
    additionalArgs?: Record<string, unknown>;

    /** Tool to fetch options from */
    optionsTool?: string | ToolBinding;
    /** Args for options tool */
    optionsArgs?: Record<string, unknown>;
    /** Transform tool result to options */
    transformOptions?: (result: unknown) => ToolSelectOption[];

    /** Static options (combined with tool options) */
    options?: ToolSelectOption[];

    // State handling
    /** Placeholder text */
    placeholder?: string;
    /** Placeholder while loading options */
    loadingPlaceholder?: string;
    /** Empty state message */
    emptyMessage?: string;

    // Controlled/Uncontrolled
    /** Controlled value */
    value?: string;
    /** Default value */
    defaultValue?: string;
    /** Called when value changes */
    onValueChange?: (value: string) => void;

    // Callbacks
    /** Called when options are loaded */
    onOptionsLoaded?: (options: ToolSelectOption[]) => void;
    /** Called when selection tool succeeds */
    onSelectionSuccess?: (result: unknown) => void;
    /** Called when selection tool fails */
    onSelectionError?: (error: Error) => void;

    // Display
    /** Show toast on selection success */
    showSuccessToast?: boolean;
    /** Success message */
    successMessage?: string | ((result: unknown) => string);

    // Styling
    className?: string;
    disabled?: boolean;
}

/**
 * ToolSelect component
 */
export function ToolSelect({
    onSelectTool,
    argName = 'value',
    additionalArgs = {},
    optionsTool,
    optionsArgs = {},
    transformOptions,
    options: staticOptions = [],
    placeholder = 'Select an option',
    loadingPlaceholder = 'Loading...',
    emptyMessage = 'No options available',
    value: controlledValue,
    defaultValue,
    onValueChange,
    onOptionsLoaded,
    onSelectionSuccess,
    onSelectionError,
    showSuccessToast = false,
    successMessage,
    className,
    disabled = false,
}: ToolSelectProps) {
    // State for fetched options
    const [fetchedOptions, setFetchedOptions] = useState<ToolSelectOption[]>([]);
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');

    // Normalize tool configs
    const optionsToolConfig = optionsTool
        ? (typeof optionsTool === 'string' ? { name: optionsTool } : optionsTool)
        : null;

    const selectToolConfig = onSelectTool
        ? (typeof onSelectTool === 'string' ? { name: onSelectTool } : onSelectTool)
        : null;

    // Options fetch hook
    const optionsHook = useTool(optionsToolConfig?.name ?? '', {
        defaultArgs: { ...optionsToolConfig?.args, ...optionsArgs },
    });

    // Selection tool hook
    const selectHook = useTool(selectToolConfig?.name ?? '', {
        onSuccess: (result) => {
            onSelectionSuccess?.(result);
            if (showSuccessToast) {
                const message = typeof successMessage === 'function'
                    ? successMessage(result)
                    : successMessage ?? 'Selection saved';
                toast.success(message);
            }
        },
        onError: onSelectionError,
    });

    // Fetch options on mount
    useEffect(() => {
        if (optionsToolConfig) {
            optionsHook.call().then((result) => {
                const options = transformOptions
                    ? transformOptions(result)
                    : (result as ToolSelectOption[]);
                setFetchedOptions(options);
                onOptionsLoaded?.(options);
            }).catch(() => {
                // Error is handled by the hook
            });
        }
    }, [optionsToolConfig?.name]);

    // Combine static and fetched options
    const allOptions = [...staticOptions, ...fetchedOptions];

    // Controlled vs uncontrolled
    const value = controlledValue ?? internalValue;

    /**
     * Handle value change
     */
    const handleValueChange = useCallback((newValue: string) => {
        // Update internal state
        setInternalValue(newValue);

        // Call external handler
        onValueChange?.(newValue);

        // Call selection tool if configured
        if (selectToolConfig) {
            selectHook.call({
                [argName]: newValue,
                ...additionalArgs,
            } as Record<string, unknown>);
        }
    }, [onValueChange, selectToolConfig, argName, additionalArgs, selectHook]);

    // Loading state
    const isLoading = optionsHook.loading || selectHook.loading;
    const hasError = optionsHook.error || selectHook.error;

    return (
        <Select
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className={cn('w-full', className)}>
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">
                            {optionsHook.loading ? loadingPlaceholder : 'Saving...'}
                        </span>
                    </div>
                ) : (
                    <SelectValue placeholder={placeholder} />
                )}
            </SelectTrigger>
            <SelectContent>
                {allOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        {hasError ? 'Error loading options' : emptyMessage}
                    </div>
                ) : (
                    allOptions.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            <div className="flex items-center gap-2">
                                {option.icon}
                                <div>
                                    <div>{option.label}</div>
                                    {option.description && (
                                        <div className="text-xs text-muted-foreground">
                                            {option.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    );
}
