/**
 * ToolInput - Input component with MCP tool integration
 *
 * Features:
 * - Debounced search with tool calls
 * - Autocomplete with suggestions from tool results
 * - Minimum character threshold
 * - Loading states
 *
 * @example Debounced search
 * ```tsx
 * <ToolInput
 *   searchTool="search-products"
 *   argName="query"
 *   debounce={300}
 *   minChars={2}
 * />
 * ```
 *
 * @example With autocomplete
 * ```tsx
 * <ToolInput
 *   searchTool="search-users"
 *   autocomplete
 *   transformSuggestions={(r) => r.users.map(u => ({
 *     value: u.id,
 *     label: u.name,
 *     description: u.email
 *   }))}
 *   onSuggestionSelect={(s) => selectUser(s.value)}
 * />
 * ```
 */
'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTool } from './useTool';
import { cn } from '@/lib/utils';
import type { ToolBinding } from '@/types/mcp-types';

/**
 * Suggestion type for autocomplete
 */
export interface ToolInputSuggestion {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

/**
 * ToolInput props
 */
export interface ToolInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  /** Tool to call on input change (debounced) */
  searchTool?: string | ToolBinding;
  /** Debounce delay in ms */
  debounce?: number;
  /** Minimum characters before calling tool */
  minChars?: number;
  /** Field name for the input value */
  argName?: string;
  /** Additional args to pass with search */
  additionalArgs?: Record<string, unknown>;

  // Autocomplete
  /** Enable autocomplete dropdown */
  autocomplete?: boolean;
  /** Transform search results to suggestions */
  transformSuggestions?: (result: unknown) => ToolInputSuggestion[];
  /** Called when suggestion is selected */
  onSuggestionSelect?: (suggestion: ToolInputSuggestion) => void;
  /** Empty state message */
  emptyMessage?: string;

  // Controlled
  value?: string;
  onChange?: (value: string) => void;

  // Callbacks
  /** Called with search results */
  onSearchResults?: (results: unknown) => void;
  /** Called on search error */
  onSearchError?: (error: Error) => void;

  // Display
  /** Show search icon */
  showSearchIcon?: boolean;
  /** Show clear button */
  showClearButton?: boolean;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
}

/**
 * ToolInput component
 */
export function ToolInput({
  searchTool,
  debounce = 300,
  minChars = 1,
  argName = 'query',
  additionalArgs = {},
  autocomplete = false,
  transformSuggestions,
  onSuggestionSelect,
  emptyMessage = 'No results found',
  value: controlledValue,
  onChange,
  onSearchResults,
  onSearchError,
  showSearchIcon = true,
  showClearButton = true,
  showLoadingIndicator = true,
  className,
  placeholder = 'Search...',
  disabled,
  ...props
}: ToolInputProps) {
  // State
  const [internalValue, setInternalValue] = useState('');
  const [suggestions, setSuggestions] = useState<ToolInputSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize tool config
  const toolConfig = searchTool
    ? typeof searchTool === 'string'
      ? { name: searchTool }
      : searchTool
    : null;

  // Search tool hook
  const { call, loading, error, reset } = useTool(toolConfig?.name ?? '', {
    defaultArgs: { ...toolConfig?.args, ...additionalArgs },
    onSuccess: (result) => {
      onSearchResults?.(result);
      if (autocomplete && transformSuggestions) {
        const suggestions = transformSuggestions(result);
        setSuggestions(suggestions);
        if (suggestions.length > 0) {
          setIsOpen(true);
        }
      }
    },
    onError: onSearchError,
  });

  // Controlled vs uncontrolled
  const value = controlledValue ?? internalValue;

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Update internal state
      setInternalValue(newValue);
      onChange?.(newValue);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Reset if below minChars
      if (newValue.length < minChars) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      // Debounced search
      if (toolConfig) {
        debounceRef.current = setTimeout(() => {
          call({ [argName]: newValue } as Record<string, unknown>);
        }, debounce);
      }
    },
    [onChange, minChars, toolConfig, argName, debounce, call]
  );

  /**
   * Handle clear
   */
  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    setSuggestions([]);
    setIsOpen(false);
    reset();
    inputRef.current?.focus();
  }, [onChange, reset]);

  /**
   * Handle suggestion select
   */
  const handleSelect = useCallback(
    (suggestion: ToolInputSuggestion) => {
      setInternalValue(suggestion.label);
      onChange?.(suggestion.label);
      setIsOpen(false);
      onSuggestionSelect?.(suggestion);
    },
    [onChange, onSuggestionSelect]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Base input element
  const inputElement = (
    <div className={cn('relative', className)}>
      {showSearchIcon && (
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          showSearchIcon && 'pl-9',
          (showClearButton || showLoadingIndicator) && 'pr-9'
        )}
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {showLoadingIndicator && loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {showClearButton && value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // If no autocomplete, just return input
  if (!autocomplete) {
    return inputElement;
  }

  // With autocomplete popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{inputElement}</PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.value}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <div className="flex items-center gap-2">
                    {suggestion.icon}
                    <div>
                      <div>{suggestion.label}</div>
                      {suggestion.description && (
                        <div className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
