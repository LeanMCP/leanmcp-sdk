import { Tool, Resource, Prompt, SchemaConstraint, Optional } from "@leanmcp/core";
import { products, categories, brands, priceRange } from "../data/products.js";

// ============================================================================
// Input Schema Classes
// ============================================================================

class SearchProductsInput {
    @Optional()
    @SchemaConstraint({
        description: 'Search query (matches name, description, and tags)',
        default: ''
    })
    query?: string;

    @Optional()
    @SchemaConstraint({
        description: 'Filter by category',
        enum: ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports']
    })
    category?: string;

    @Optional()
    @SchemaConstraint({
        description: 'Filter by brand name'
    })
    brand?: string;

    @Optional()
    @SchemaConstraint({
        description: 'Minimum price',
        minimum: 0
    })
    minPrice?: number;

    @Optional()
    @SchemaConstraint({
        description: 'Maximum price',
        minimum: 0
    })
    maxPrice?: number;

    @Optional()
    @SchemaConstraint({
        description: 'Only show in-stock items'
    })
    inStock?: boolean;

    @Optional()
    @SchemaConstraint({
        description: 'Sort results',
        enum: ['price_asc', 'price_desc', 'rating', 'newest'],
        default: 'rating'
    })
    sortBy?: string;

    @Optional()
    @SchemaConstraint({
        description: 'Page number (1-indexed)',
        minimum: 1,
        default: 1
    })
    page?: number;

    @Optional()
    @SchemaConstraint({
        description: 'Results per page',
        minimum: 1,
        maximum: 50,
        default: 10
    })
    pageSize?: number;
}

class GetProductDetailsInput {
    @SchemaConstraint({
        description: 'Product ID (e.g., prod-001)',
        minLength: 1
    })
    productId!: string;
}

class GetRecommendationsInput {
    @SchemaConstraint({
        description: 'Product ID to get recommendations for',
        minLength: 1
    })
    productId!: string;

    @Optional()
    @SchemaConstraint({
        description: 'Maximum number of recommendations to return',
        minimum: 1,
        maximum: 10,
        default: 5
    })
    limit?: number;
}

class ProductSearchAssistantInput {
    @SchemaConstraint({
        description: 'What the customer is looking for'
    })
    query!: string;

    @Optional()
    @SchemaConstraint({
        description: 'Customer budget (e.g., "under $50", "$100-$300")'
    })
    budget?: string;

    @Optional()
    @SchemaConstraint({
        description: 'Any customer preferences or requirements'
    })
    preferences?: string;
}

// ============================================================================
// Product Search Service
// ============================================================================

/**
 * E-commerce Product Search Service
 *
 * Demonstrates LeanMCP decorators with all three MCP primitives:
 * - @Tool: searchProducts, getProductDetails, getCategories, getProductRecommendations
 * - @Resource: productCatalog
 * - @Prompt: productSearchAssistant
 */
export class ProductSearchService {

    // ==========================================================================
    // Tools
    // ==========================================================================

    /**
     * Search products with full-text query, filters, sorting, and pagination
     */
    @Tool({
        description: 'Search products with full-text query, category/brand/price filters, sorting, and pagination',
        inputClass: SearchProductsInput
    })
    async searchProducts(args: SearchProductsInput) {
        let results = [...products];

        // Full-text search across name, description, and tags
        if (args.query) {
            const query = args.query.toLowerCase();
            results = results.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        // Apply filters
        if (args.category) {
            results = results.filter(p => p.category === args.category);
        }
        if (args.brand) {
            results = results.filter(p => p.brand.toLowerCase() === args.brand!.toLowerCase());
        }
        if (args.minPrice !== undefined) {
            results = results.filter(p => p.price >= args.minPrice!);
        }
        if (args.maxPrice !== undefined) {
            results = results.filter(p => p.price <= args.maxPrice!);
        }
        if (args.inStock !== undefined) {
            results = results.filter(p => p.inStock === args.inStock);
        }

        // Sort
        const sortBy = args.sortBy || 'rating';
        switch (sortBy) {
            case 'price_asc':
                results.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                results.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                results.sort((a, b) => b.rating - a.rating);
                break;
            case 'newest':
                results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
        }

        // Paginate
        const page = args.page || 1;
        const pageSize = args.pageSize || 10;
        const totalResults = results.length;
        const totalPages = Math.ceil(totalResults / pageSize);
        const startIndex = (page - 1) * pageSize;
        const paginatedResults = results.slice(startIndex, startIndex + pageSize);

        return {
            products: paginatedResults,
            pagination: {
                page,
                pageSize,
                totalResults,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            },
            filters: {
                query: args.query || null,
                category: args.category || null,
                brand: args.brand || null,
                minPrice: args.minPrice ?? null,
                maxPrice: args.maxPrice ?? null,
                inStock: args.inStock ?? null,
                sortBy
            }
        };
    }

    /**
     * Get full details for a single product by ID
     */
    @Tool({
        description: 'Get full details for a single product by its ID',
        inputClass: GetProductDetailsInput
    })
    async getProductDetails(args: GetProductDetailsInput) {
        const product = products.find(p => p.id === args.productId);

        if (!product) {
            return {
                error: `Product not found: ${args.productId}`,
                availableIds: products.map(p => p.id)
            };
        }

        return {
            product,
            relatedCategories: categories.filter(c => c !== product.category),
            sameBrandCount: products.filter(p => p.brand === product.brand && p.id !== product.id).length
        };
    }

    /**
     * List all product categories with counts
     */
    @Tool({
        description: 'List all product categories with product counts and price ranges'
    })
    async getCategories() {
        const categoryDetails = categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category);
            const prices = categoryProducts.map(p => p.price);
            return {
                name: category,
                productCount: categoryProducts.length,
                inStockCount: categoryProducts.filter(p => p.inStock).length,
                priceRange: {
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                },
                topBrands: [...new Set(categoryProducts.map(p => p.brand))]
            };
        });

        return {
            categories: categoryDetails,
            totalCategories: categories.length,
            totalProducts: products.length
        };
    }

    /**
     * Get product recommendations based on category and tags
     */
    @Tool({
        description: 'Get product recommendations similar to a given product, based on shared category and tags',
        inputClass: GetRecommendationsInput
    })
    async getProductRecommendations(args: GetRecommendationsInput) {
        const sourceProduct = products.find(p => p.id === args.productId);

        if (!sourceProduct) {
            return {
                error: `Product not found: ${args.productId}`,
                availableIds: products.map(p => p.id)
            };
        }

        const limit = args.limit || 5;

        // Score each product by similarity (shared category + shared tags)
        const scored = products
            .filter(p => p.id !== sourceProduct.id)
            .map(p => {
                let score = 0;
                if (p.category === sourceProduct.category) score += 3;
                const sharedTags = p.tags.filter(t => sourceProduct.tags.includes(t));
                score += sharedTags.length;
                // Bonus for similar price range (within 30%)
                const priceDiff = Math.abs(p.price - sourceProduct.price) / sourceProduct.price;
                if (priceDiff < 0.3) score += 1;
                return { product: p, score, sharedTags };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            sourceProduct: {
                id: sourceProduct.id,
                name: sourceProduct.name,
                category: sourceProduct.category,
                tags: sourceProduct.tags
            },
            recommendations: scored.map(s => ({
                product: s.product,
                similarityScore: s.score,
                sharedTags: s.sharedTags
            }))
        };
    }

    // ==========================================================================
    // Resource
    // ==========================================================================

    /**
     * Full product catalog as a data resource
     */
    @Resource({
        description: 'Full product catalog with all products, categories, and brands',
        mimeType: 'application/json'
    })
    async productCatalog() {
        return {
            contents: [{
                uri: 'ecommerce://catalog',
                mimeType: 'application/json',
                text: JSON.stringify({
                    products,
                    totalProducts: products.length,
                    categories,
                    brands,
                    priceRange
                }, null, 2)
            }]
        };
    }

    // ==========================================================================
    // Prompt
    // ==========================================================================

    /**
     * AI shopping assistant prompt template
     */
    @Prompt({
        description: 'Generate a prompt for an AI shopping assistant to help find products',
        inputClass: ProductSearchAssistantInput
    })
    async productSearchAssistant(args: ProductSearchAssistantInput) {
        const budgetInfo = args.budget ? `\nBudget: ${args.budget}` : '';
        const prefsInfo = args.preferences ? `\nPreferences: ${args.preferences}` : '';

        return {
            messages: [{
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: `You are a helpful shopping assistant for an e-commerce store. Help the customer find the right products.

Available categories: ${categories.join(', ')}
Available brands: ${brands.join(', ')}
Price range: $${priceRange.min} - $${priceRange.max}

Customer request: ${args.query}${budgetInfo}${prefsInfo}

Use the searchProducts tool to find matching products. If the customer needs more details, use getProductDetails. For similar items, use getProductRecommendations.`
                }
            }]
        };
    }
}
