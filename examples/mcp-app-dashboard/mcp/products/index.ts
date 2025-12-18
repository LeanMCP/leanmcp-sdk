/**
 * ProductsService - CRUD operations with MCP Apps UI
 * 
 * Demonstrates proper @UIApp decorator usage:
 * 1. @UIApp links tools to React components via path string
 * 2. `leanmcp dev` pre-builds components to dist/ui/
 * 3. @leanmcp/core auto-registers UI resources from manifest
 */
import { Tool, SchemaConstraint, Optional } from "@leanmcp/core";
import { UIApp } from "@leanmcp/ui/server";

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
    createdAt: string;
}

// ============================================================================
// In-Memory Database
// ============================================================================

const products: Product[] = [
    { id: '1', name: 'Wireless Headphones', description: 'Premium noise-canceling headphones', price: 299.99, category: 'Electronics', stock: 45, status: 'active', createdAt: '2024-01-15' },
    { id: '2', name: 'Smart Watch Pro', description: 'Advanced fitness tracking smartwatch', price: 399.99, category: 'Electronics', stock: 23, status: 'active', createdAt: '2024-02-01' },
    { id: '3', name: 'Ergonomic Keyboard', description: 'Split mechanical keyboard for comfort', price: 179.99, category: 'Accessories', stock: 67, status: 'active', createdAt: '2024-02-10' },
    { id: '4', name: 'USB-C Hub', description: '7-in-1 multiport adapter', price: 49.99, category: 'Accessories', stock: 120, status: 'active', createdAt: '2024-02-15' },
    { id: '5', name: '4K Webcam', description: 'Ultra HD streaming camera', price: 199.99, category: 'Electronics', stock: 34, status: 'active', createdAt: '2024-03-01' },
    { id: '6', name: 'Standing Desk Mat', description: 'Anti-fatigue comfort mat', price: 79.99, category: 'Office', stock: 89, status: 'active', createdAt: '2024-03-10' },
    { id: '7', name: 'Monitor Light Bar', description: 'LED desk lamp with dimmer', price: 59.99, category: 'Office', stock: 8, status: 'active', createdAt: '2024-03-15' },
    { id: '8', name: 'Wireless Mouse', description: 'Precision gaming mouse', price: 89.99, category: 'Accessories', stock: 0, status: 'archived', createdAt: '2024-01-01' },
];

let nextId = 9;

// ============================================================================
// Input Classes
// ============================================================================

class ListProductsInput {
    @Optional()
    @SchemaConstraint({ description: "Page number (1-indexed)", default: 1 })
    page?: number;

    @Optional()
    @SchemaConstraint({ description: "Items per page", default: 10 })
    pageSize?: number;

    @Optional()
    @SchemaConstraint({ description: "Sort by field" })
    sortBy?: string;

    @Optional()
    @SchemaConstraint({ description: "Sort direction", enum: ["asc", "desc"], default: "asc" })
    sortDirection?: 'asc' | 'desc';
}

class GetProductInput {
    @SchemaConstraint({ description: "Product ID" })
    id!: string;
}

class CreateProductInput {
    @SchemaConstraint({ description: "Product name", minLength: 1, maxLength: 100 })
    name!: string;

    @Optional()
    @SchemaConstraint({ description: "Product description" })
    description?: string;

    @SchemaConstraint({ description: "Price in USD", minimum: 0 })
    price!: number;

    @SchemaConstraint({ description: "Product category", enum: ["Electronics", "Accessories", "Office", "Other"] })
    category!: string;

    @Optional()
    @SchemaConstraint({ description: "Stock quantity", minimum: 0, default: 0 })
    stock?: number;
}

class DeleteProductInput {
    @SchemaConstraint({ description: "Product ID to delete" })
    id!: string;
}

// ============================================================================
// ProductsService
// ============================================================================

export class ProductsService {

    /**
     * List products with pagination
     * 
     * @UIApp links this tool to ProductsDashboard.tsx
     * - Auto-generates URI: ui://products/listProducts
     * - CLI builds component to dist/ui/products-listproducts.html
     */
    @Tool({
        description: "List products with pagination and sorting. Returns paginated product list.",
        inputClass: ListProductsInput
    })
    @UIApp({
        component: './ProductsDashboard',
        title: 'Products Dashboard'
    })
    async listProducts(input: ListProductsInput) {
        let filtered = [...products];

        // Sorting
        if (input.sortBy) {
            const direction = input.sortDirection === 'desc' ? -1 : 1;
            filtered.sort((a, b) => {
                const aVal = a[input.sortBy as keyof Product];
                const bVal = b[input.sortBy as keyof Product];
                if (typeof aVal === 'string') {
                    return direction * aVal.localeCompare(bVal as string);
                }
                return direction * ((aVal as number) - (bVal as number));
            });
        }

        // Pagination
        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 10;
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);

        return {
            products: paginated,
            total: filtered.length,
            page,
            pageSize,
            totalPages: Math.ceil(filtered.length / pageSize)
        };
    }

    /**
     * Get a single product by ID
     */
    @Tool({
        description: "Get a single product by ID",
        inputClass: GetProductInput
    })
    @UIApp({
        component: './ProductsDashboard',
        title: 'Products Dashboard'
    })
    async getProduct(input: GetProductInput) {
        const product = products.find(p => p.id === input.id);
        if (!product) {
            throw new Error(`Product not found: ${input.id}`);
        }
        return { product };
    }

    /**
     * Create a new product
     */
    @Tool({
        description: "Create a new product. Returns the created product.",
        inputClass: CreateProductInput
    })
    @UIApp({
        component: './ProductsDashboard',
        title: 'Products Dashboard'
    })
    async createProduct(input: CreateProductInput) {
        const newProduct: Product = {
            id: String(nextId++),
            name: input.name,
            description: input.description ?? '',
            price: input.price,
            category: input.category,
            stock: input.stock ?? 0,
            status: 'draft',
            createdAt: new Date().toISOString().split('T')[0]
        };

        products.push(newProduct);

        return {
            success: true,
            product: newProduct,
            message: `Created product: ${newProduct.name}`
        };
    }

    /**
     * Delete a product
     */
    @Tool({
        description: "Delete a product by ID. This action cannot be undone.",
        inputClass: DeleteProductInput
    })
    @UIApp({
        component: './ProductsDashboard',
        title: 'Products Dashboard'
    })
    async deleteProduct(input: DeleteProductInput) {
        const index = products.findIndex(p => p.id === input.id);
        if (index === -1) {
            throw new Error(`Product not found: ${input.id}`);
        }

        const deleted = products.splice(index, 1)[0];

        return {
            success: true,
            deletedId: input.id,
            message: `Deleted product: ${deleted.name}`
        };
    }

    /**
     * Get dashboard statistics
     */
    @Tool({
        description: "Get dashboard statistics including totals and breakdown"
    })
    @UIApp({
        component: './ProductsDashboard',
        title: 'Products Dashboard'
    })
    async getStats() {
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const lowStock = products.filter(p => p.stock < 10 && p.stock > 0).length;
        const outOfStock = products.filter(p => p.stock === 0).length;

        return {
            totalProducts,
            totalValue: Math.round(totalValue * 100) / 100,
            lowStock,
            outOfStock
        };
    }
}
