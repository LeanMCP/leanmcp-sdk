/**
 * ToolDataGrid - Data grid with MCP tool integration for server-side operations
 * 
 * Features:
 * - Fetch data from an MCP tool
 * - Server-side pagination, sorting, filtering
 * - Row actions that trigger tool calls
 * - Auto-refresh with polling
 * - Column configuration
 * 
 * @example Basic usage
 * ```tsx
 * <ToolDataGrid
 *   dataTool="list-users"
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email' },
 *     { key: 'status', header: 'Status' }
 *   ]}
 *   transformData={(result) => ({
 *     rows: result.users,
 *     total: result.total
 *   })}
 * />
 * ```
 * 
 * @example With row actions
 * ```tsx
 * <ToolDataGrid
 *   dataTool="list-orders"
 *   columns={columns}
 *   rowActions={[
 *     { 
 *       label: 'Edit', 
 *       tool: 'edit-order',
 *       getArgs: (row) => ({ id: row.id })
 *     },
 *     { 
 *       label: 'Delete', 
 *       tool: 'delete-order',
 *       variant: 'destructive',
 *       confirm: true
 *     }
 *   ]}
 * />
 * ```
 */
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTool } from './useTool';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ToolBinding, ConfirmConfig } from '@/types/mcp-types';

/**
 * Column definition for ToolDataGrid
 */
export interface ToolDataGridColumn<T = Record<string, unknown>> {
    /** Unique key for this column (dot notation supported) */
    key: string;
    /** Column header */
    header: string;
    /** Enable sorting for this column */
    sortable?: boolean;
    /** Custom cell renderer */
    render?: (value: unknown, row: T, index: number) => React.ReactNode;
    /** Column width (CSS value) */
    width?: string;
    /** Align content */
    align?: 'left' | 'center' | 'right';
    /** Hide column on small screens */
    hideMobile?: boolean;
}

/**
 * Row action definition
 */
export interface ToolDataGridRowAction<T = Record<string, unknown>> {
    /** Action button label */
    label: string;
    /** Icon to show */
    icon?: React.ReactNode;
    /** Tool to call */
    tool: string | ToolBinding;
    /** Get args from row data */
    getArgs?: (row: T) => Record<string, unknown>;
    /** Button variant */
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    /** Require confirmation */
    confirm?: boolean | ConfirmConfig;
    /** Hide for certain rows */
    hidden?: (row: T) => boolean;
    /** Called on success */
    onSuccess?: (result: unknown, row: T) => void;
}

/**
 * Pagination state
 */
export interface PaginationState {
    page: number;
    pageSize: number;
}

/**
 * Sort state
 */
export interface SortState {
    column: string | null;
    direction: 'asc' | 'desc';
}

/**
 * Data result from transform function
 */
export interface ToolDataGridData<T = Record<string, unknown>> {
    rows: T[];
    total: number;
}

/**
 * ToolDataGrid props
 */
export interface ToolDataGridProps<T = Record<string, unknown>> {
    /** Tool to fetch data from */
    dataTool: string | ToolBinding;
    /** Column definitions */
    columns: ToolDataGridColumn<T>[];
    /** Transform tool result to grid data */
    transformData?: (result: unknown) => ToolDataGridData<T>;

    // Row actions
    /** Actions to show for each row */
    rowActions?: ToolDataGridRowAction<T>[];

    // Pagination
    /** Enable pagination */
    pagination?: boolean;
    /** Page sizes to offer */
    pageSizes?: number[];
    /** Default page size */
    defaultPageSize?: number;

    // Sorting
    /** Default sort */
    defaultSort?: SortState;

    // Refresh
    /** Auto-refresh interval in ms */
    refreshInterval?: number;
    /** Show refresh button */
    showRefresh?: boolean;

    // State callbacks
    /** Called when data is loaded */
    onDataLoaded?: (data: ToolDataGridData<T>) => void;
    /** Called on error */
    onError?: (error: Error) => void;

    // Row interaction
    /** Called when row is clicked */
    onRowClick?: (row: T, index: number) => void;
    /** Key extractor for rows */
    getRowKey?: (row: T, index: number) => string;

    // Empty/Loading states
    /** Empty state content */
    emptyContent?: React.ReactNode;
    /** Loading content */
    loadingContent?: React.ReactNode;

    // Styling
    className?: string;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue<T>(obj: T, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object' && key in current) {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

/**
 * ToolDataGrid component
 */
export function ToolDataGrid<T = Record<string, unknown>>({
    dataTool,
    columns,
    transformData,
    rowActions = [],
    pagination = true,
    pageSizes = [10, 25, 50, 100],
    defaultPageSize = 10,
    defaultSort,
    refreshInterval,
    showRefresh = true,
    onDataLoaded,
    onError,
    onRowClick,
    getRowKey,
    emptyContent,
    loadingContent,
    className,
}: ToolDataGridProps<T>) {
    // Normalize tool config
    const toolConfig = typeof dataTool === 'string' ? { name: dataTool } : dataTool;

    // State
    const [data, setData] = useState<ToolDataGridData<T>>({ rows: [], total: 0 });
    const [paginationState, setPaginationState] = useState<PaginationState>({
        page: 1,
        pageSize: defaultPageSize,
    });
    const [sortState, setSortState] = useState<SortState>(
        defaultSort ?? { column: null, direction: 'asc' }
    );

    // Data fetch hook
    const { call, loading, error } = useTool(toolConfig.name, {
        defaultArgs: toolConfig.args,
        onSuccess: (result) => {
            const gridData = transformData
                ? transformData(result)
                : (result as ToolDataGridData<T>);
            setData(gridData);
            onDataLoaded?.(gridData);
        },
        onError,
    });

    /**
     * Fetch data with current state
     */
    const fetchData = useCallback(() => {
        const args: Record<string, unknown> = {};

        if (pagination) {
            args.page = paginationState.page;
            args.pageSize = paginationState.pageSize;
            args.offset = (paginationState.page - 1) * paginationState.pageSize;
            args.limit = paginationState.pageSize;
        }

        if (sortState.column) {
            args.sortBy = sortState.column;
            args.sortDirection = sortState.direction;
            args.sort = `${sortState.column}:${sortState.direction}`;
        }

        call(args);
    }, [call, pagination, paginationState, sortState]);

    // Track if initial fetch has been done to prevent infinite loops
    const initialFetchDone = React.useRef(false);
    const prevStateRef = React.useRef({ pagination: paginationState, sort: sortState });

    // Fetch on mount (once) and on pagination/sort state changes
    useEffect(() => {
        // On mount, fetch data once
        if (!initialFetchDone.current) {
            initialFetchDone.current = true;
            fetchData();
            return;
        }

        // On state changes (pagination, sort), refetch
        const prevState = prevStateRef.current;
        const stateChanged =
            prevState.pagination.page !== paginationState.page ||
            prevState.pagination.pageSize !== paginationState.pageSize ||
            prevState.sort.column !== sortState.column ||
            prevState.sort.direction !== sortState.direction;

        if (stateChanged) {
            prevStateRef.current = { pagination: paginationState, sort: sortState };
            fetchData();
        }
    }, [fetchData, paginationState, sortState]);

    // Auto-refresh
    useEffect(() => {
        if (refreshInterval && refreshInterval > 0) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, fetchData]);

    /**
     * Handle sort column click
     */
    const handleSort = useCallback((column: string) => {
        setSortState(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    /**
     * Handle page change
     */
    const handlePageChange = useCallback((page: number) => {
        setPaginationState(prev => ({ ...prev, page }));
    }, []);

    /**
     * Handle page size change
     */
    const handlePageSizeChange = useCallback((pageSize: string) => {
        setPaginationState({ page: 1, pageSize: parseInt(pageSize, 10) });
    }, []);

    // Compute pagination
    const totalPages = Math.ceil(data.total / paginationState.pageSize);
    const canPreviousPage = paginationState.page > 1;
    const canNextPage = paginationState.page < totalPages;

    /**
     * Get sort icon for column
     */
    const getSortIcon = (column: string) => {
        if (sortState.column !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return sortState.direction === 'asc'
            ? <ArrowUp className="h-4 w-4" />
            : <ArrowDown className="h-4 w-4" />;
    };

    /**
     * Render loading skeleton
     */
    const renderLoading = () => {
        if (loadingContent) return loadingContent;

        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    };

    /**
     * Render empty state
     */
    const renderEmpty = () => {
        if (emptyContent) return emptyContent;

        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-lg">No data found</p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchData}
                    className="mt-2"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
        );
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Toolbar */}
            {showRefresh && (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
                {loading && data.rows.length === 0 ? (
                    <div className="p-4">
                        {renderLoading()}
                    </div>
                ) : data.rows.length === 0 ? (
                    renderEmpty()
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.key}
                                        style={{ width: column.width }}
                                        className={cn(
                                            column.align === 'center' && 'text-center',
                                            column.align === 'right' && 'text-right',
                                            column.hideMobile && 'hidden md:table-cell'
                                        )}
                                    >
                                        {column.sortable ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort(column.key)}
                                                className="-ml-3"
                                            >
                                                {column.header}
                                                {getSortIcon(column.key)}
                                            </Button>
                                        ) : (
                                            column.header
                                        )}
                                    </TableHead>
                                ))}
                                {rowActions.length > 0 && (
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.rows.map((row, index) => {
                                const key = getRowKey?.(row, index) ?? String(index);
                                return (
                                    <TableRow
                                        key={key}
                                        onClick={() => onRowClick?.(row, index)}
                                        className={onRowClick ? 'cursor-pointer' : undefined}
                                    >
                                        {columns.map((column) => {
                                            const value = getNestedValue(row, column.key);
                                            return (
                                                <TableCell
                                                    key={column.key}
                                                    className={cn(
                                                        column.align === 'center' && 'text-center',
                                                        column.align === 'right' && 'text-right',
                                                        column.hideMobile && 'hidden md:table-cell'
                                                    )}
                                                >
                                                    {column.render
                                                        ? column.render(value, row, index)
                                                        : String(value ?? '')}
                                                </TableCell>
                                            );
                                        })}
                                        {rowActions.length > 0 && (
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {rowActions
                                                        .filter(action => !action.hidden?.(row))
                                                        .map((action, actionIndex) => (
                                                            <RowActionButton
                                                                key={actionIndex}
                                                                action={action}
                                                                row={row}
                                                                onRefresh={fetchData}
                                                            />
                                                        ))}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {pagination && data.total > 0 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((paginationState.page - 1) * paginationState.pageSize) + 1} to{' '}
                        {Math.min(paginationState.page * paginationState.pageSize, data.total)} of{' '}
                        {data.total} results
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page</span>
                            <Select
                                value={String(paginationState.pageSize)}
                                onValueChange={handlePageSizeChange}
                            >
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizes.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(paginationState.page - 1)}
                                disabled={!canPreviousPage || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm">
                                Page {paginationState.page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(paginationState.page + 1)}
                                disabled={!canNextPage || loading}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Internal row action button component
 */
function RowActionButton<T>({
    action,
    row,
    onRefresh,
}: {
    action: ToolDataGridRowAction<T>;
    row: T;
    onRefresh: () => void;
}) {
    const toolConfig = typeof action.tool === 'string' ? { name: action.tool } : action.tool;
    const args = action.getArgs?.(row) ?? { id: (row as Record<string, unknown>).id };

    const { call, loading } = useTool(toolConfig.name, {
        onSuccess: (result) => {
            action.onSuccess?.(result, row);
            toast.success('Action completed');
            onRefresh();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Add confirmation dialog support
        call(args);
    }, [call, args]);

    return (
        <Button
            variant={action.variant ?? 'ghost'}
            size="sm"
            onClick={handleClick}
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <>
                    {action.icon}
                    <span className={action.icon ? 'ml-1' : ''}>{action.label}</span>
                </>
            )}
        </Button>
    );
}
