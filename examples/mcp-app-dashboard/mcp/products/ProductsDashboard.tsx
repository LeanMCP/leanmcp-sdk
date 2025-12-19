/**
 * ProductsDashboard - React component for MCP App UI
 * 
 * This component is referenced by @UIApp decorator and built by `leanmcp dev`.
 * It uses @leanmcp/ui components to interact with MCP tools.
 */
import React, { useState, useEffect } from 'react';
import {
    ToolDataGrid,
    ToolButton,
    ToolForm,
    useTool,
    useHostContext,
    RequireConnection,
    type ToolFormField,
    type ToolDataGridColumn
} from '@leanmcp/ui';

// ============================================================================
// Types
// ============================================================================

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    status: 'active' | 'draft' | 'archived';
}

interface Stats {
    totalProducts: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
}

// ============================================================================
// Main Dashboard Component (exported for @UIApp)
// ============================================================================

// NOTE: Don't wrap with AppProvider here - CLI entry already provides it
export function ProductsDashboard() {
    return (
        <RequireConnection loading={<LoadingState />}>
            <DashboardContent />
        </RequireConnection>
    );
}

// Also export as default for convenience
export default ProductsDashboard;

// ============================================================================
// Sub-Components
// ============================================================================

function LoadingState() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );
}

function DashboardContent() {
    const { theme } = useHostContext();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = () => setRefreshKey(k => k + 1);

    return (
        <div className={`min-h-screen p-6 ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">📦 Product Dashboard</h1>
                        <p className="text-sm opacity-70">Manage your inventory</p>
                    </div>
                    <div className="flex gap-2">
                        <ToolButton
                            tool="getStats"
                            resultDisplay="toast"
                            successMessage="Stats refreshed!"
                            variant="outline"
                        >
                            ↻ Refresh
                        </ToolButton>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            {showCreateForm ? '✕ Cancel' : '+ Add Product'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <StatsRow />

            {/* Create Form */}
            {showCreateForm && (
                <section className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Create Product</h2>
                    <CreateProductForm onSuccess={() => { setShowCreateForm(false); handleRefresh(); }} />
                </section>
            )}

            {/* Products Table */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Products</h2>
                </div>
                <ProductsTable key={refreshKey} onDelete={handleRefresh} />
            </section>
        </div>
    );
}

// ============================================================================
// Stats Row
// ============================================================================

function StatsRow() {
    const { call, result, loading } = useTool<Record<string, never>, Stats>('getStats');
    const calledRef = React.useRef(false);

    useEffect(() => {
        if (!calledRef.current) {
            calledRef.current = true;
            call();
        }
    }, [call]);

    if (loading || !result) {
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-8 bg-gray-200 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Products" value={result.totalProducts} icon="📦" />
            <StatCard label="Value" value={`$${result.totalValue.toLocaleString()}`} icon="💰" />
            <StatCard label="Low Stock" value={result.lowStock} icon="⚠️" variant={result.lowStock > 0 ? 'warning' : 'default'} />
            <StatCard label="Out of Stock" value={result.outOfStock} icon="❌" variant={result.outOfStock > 0 ? 'danger' : 'default'} />
        </div>
    );
}

function StatCard({ label, value, icon, variant = 'default' }: {
    label: string;
    value: string | number;
    icon: string;
    variant?: 'default' | 'warning' | 'danger';
}) {
    const variantClasses = {
        default: 'bg-white dark:bg-gray-800',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200',
        danger: 'bg-red-50 dark:bg-red-900/20 border-red-200',
    };

    return (
        <div className={`${variantClasses[variant]} rounded-lg border p-4`}>
            <div className="flex items-center gap-2 text-sm opacity-70 mb-1">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

// ============================================================================
// Create Product Form
// ============================================================================

function CreateProductForm({ onSuccess }: { onSuccess: () => void }) {
    const fields: ToolFormField[] = [
        { name: 'name', label: 'Product Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'price', label: 'Price ($)', type: 'number', required: true, min: 0 },
        {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            options: [
                { value: 'Electronics', label: 'Electronics' },
                { value: 'Accessories', label: 'Accessories' },
                { value: 'Office', label: 'Office' },
                { value: 'Other', label: 'Other' },
            ]
        },
        { name: 'stock', label: 'Stock', type: 'number', min: 0, defaultValue: 0 },
    ];

    return (
        <ToolForm
            toolName="createProduct"
            fields={fields}
            submitText="Create Product"
            showSuccessToast
            successMessage={(r) => `Created: ${(r as { product: Product }).product.name}`}
            resetOnSuccess
            onSuccess={onSuccess}
        />
    );
}

// ============================================================================
// Products Table
// ============================================================================

function ProductsTable({ onDelete }: { onDelete: () => void }) {
    const columns: ToolDataGridColumn<Product>[] = [
        { key: 'name', header: 'Product', sortable: true },
        { key: 'category', header: 'Category', sortable: true },
        { key: 'price', header: 'Price', align: 'right', render: (v) => `$${Number(v).toFixed(2)}` },
        {
            key: 'stock', header: 'Stock', align: 'right', render: (v) => {
                const n = Number(v);
                const color = n === 0 ? 'text-red-500' : n < 10 ? 'text-yellow-500' : 'text-green-500';
                return <span className={color}>{n}</span>;
            }
        },
        {
            key: 'status', header: 'Status', render: (v) => (
                <span className={`px-2 py-0.5 rounded-full text-xs ${v === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>{String(v)}</span>
            )
        },
    ];

    return (
        <ToolDataGrid<Product>
            dataTool="listProducts"
            columns={columns}
            transformData={(r) => {
                const data = r as { products: Product[]; total: number };
                return { rows: data.products, total: data.total };
            }}
            rowActions={[{
                label: 'Delete',
                tool: 'deleteProduct',
                variant: 'destructive',
                getArgs: (row) => ({ id: row.id }),
                confirm: { title: 'Delete product?', description: 'This cannot be undone.' },
                onSuccess: onDelete
            }]}
            pagination
            pageSizes={[5, 10, 25]}
            defaultPageSize={5}
            showRefresh
            getRowKey={(row) => row.id}
        />
    );
}
