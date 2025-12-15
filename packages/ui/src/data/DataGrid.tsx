import React, { useMemo, useState, type ReactNode } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import './DataGrid.css';

export interface DataGridColumn<T> {
    /** Column key (accessor) */
    key: keyof T | string;
    /** Column header */
    header: string;
    /** Custom cell renderer */
    cell?: (value: unknown, row: T) => ReactNode;
    /** Enable sorting */
    sortable?: boolean;
    /** Column width */
    width?: number | string;
}

export interface DataGridProps<T extends Record<string, unknown>> {
    /** Data array */
    data: T[];
    /** Column definitions */
    columns: DataGridColumn<T>[];
    /** Enable global search */
    searchable?: boolean;
    /** Search placeholder */
    searchPlaceholder?: string;
    /** Row click handler */
    onRowClick?: (row: T) => void;
    /** Loading state */
    loading?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Additional class name */
    className?: string;
}

/**
 * DataGrid - Sortable, filterable data table for tool results
 * 
 * @example
 * ```tsx
 * const { result } = useTool<{ items: Item[] }>('get-items');
 * 
 * <DataGrid
 *   data={result?.items ?? []}
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'price', header: 'Price', cell: (v) => `$${v}` },
 *   ]}
 *   searchable
 * />
 * ```
 */
export function DataGrid<T extends Record<string, unknown>>({
    data,
    columns,
    searchable = false,
    searchPlaceholder = 'Search...',
    onRowClick,
    loading = false,
    emptyMessage = 'No data',
    className,
}: DataGridProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const tableColumns = useMemo<ColumnDef<T>[]>(
        () =>
            columns.map((col) => ({
                id: String(col.key),
                accessorKey: col.key,
                header: col.header,
                cell: col.cell
                    ? ({ getValue, row }) => col.cell!(getValue(), row.original)
                    : ({ getValue }) => String(getValue() ?? ''),
                enableSorting: col.sortable ?? true,
                size: typeof col.width === 'number' ? col.width : undefined,
            })),
        [columns]
    );

    const table = useReactTable({
        data,
        columns: tableColumns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className={clsx('lui-datagrid', className)}>
            {searchable && (
                <div className="lui-datagrid-search">
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="lui-datagrid-search-input"
                    />
                </div>
            )}
            <div className="lui-datagrid-container">
                <table className="lui-datagrid-table">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={clsx(
                                            'lui-datagrid-th',
                                            header.column.getCanSort() && 'lui-datagrid-th--sortable'
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{ width: header.column.getSize() }}
                                    >
                                        <div className="lui-datagrid-th-content">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getIsSorted() && (
                                                <span className="lui-datagrid-sort-icon">
                                                    {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="lui-datagrid-loading">
                                    Loading...
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="lui-datagrid-empty">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={clsx(
                                        'lui-datagrid-row',
                                        onRowClick && 'lui-datagrid-row--clickable'
                                    )}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="lui-datagrid-td">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
