# E-commerce Product Search Example

A complete LeanMCP example demonstrating product search over a mock database with full-text search, filtering, pagination, sorting, and product recommendations.

## Features Demonstrated

- **All three MCP primitives**: `@Tool`, `@Resource`, and `@Prompt` decorators
- Type-safe input schemas with `@SchemaConstraint` and `@Optional`
- Full-text search across multiple fields
- Multi-criteria filtering (category, brand, price range, stock status)
- Pagination with metadata (page count, hasNext/hasPrevious)
- Sorting (price asc/desc, rating, newest)
- Similarity-based product recommendations
- Data modeling with TypeScript interfaces

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

The server starts on `http://localhost:8080`:
- **MCP endpoint**: `http://localhost:8080/mcp`
- **Dashboard UI**: `http://localhost:8080` (test tools visually)
- **Health check**: `http://localhost:8080/health`

## Registered Tools

| Tool | Description |
|------|-------------|
| `searchProducts` | Full-text search with category, brand, price, stock filters + pagination |
| `getProductDetails` | Get complete details for a single product by ID |
| `getCategories` | List all categories with product counts and price ranges |
| `getProductRecommendations` | Get similar products based on shared category and tags |

## Resource

| Resource | Description |
|----------|-------------|
| `productCatalog` | Full product catalog as JSON (all products, categories, brands) |

## Prompt

| Prompt | Description |
|--------|-------------|
| `productSearchAssistant` | AI shopping assistant prompt with store context |

## Testing

### Search Products

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "searchProducts",
      "arguments": {
        "query": "wireless",
        "page": 1,
        "pageSize": 5
      }
    }
  }'
```

### Search with Filters

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "searchProducts",
      "arguments": {
        "category": "Electronics",
        "minPrice": 50,
        "maxPrice": 500,
        "inStock": true,
        "sortBy": "price_asc"
      }
    }
  }'
```

### Get Product Details

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "getProductDetails",
      "arguments": {
        "productId": "prod-001"
      }
    }
  }'
```

### Get Categories

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "getCategories",
      "arguments": {}
    }
  }'
```

### Get Recommendations

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "getProductRecommendations",
      "arguments": {
        "productId": "prod-001",
        "limit": 3
      }
    }
  }'
```

## Project Structure

```
ecommerce-search/
├── main.ts                    # Entry point - starts MCP server
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── README.md                  # This file
└── mcp/
    ├── data/
    │   └── products.ts        # Mock product database (20 products)
    └── products/
        └── index.ts           # Product search service (Tools, Resource, Prompt)
```

## Key Concepts

### Pagination

The `searchProducts` tool returns paginated results with metadata:

```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalResults": 20,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Input Validation

Input schemas use `@SchemaConstraint` for validation:

```typescript
@Optional()
@SchemaConstraint({
  description: 'Results per page',
  minimum: 1,
  maximum: 50,
  default: 10
})
pageSize?: number;
```

## Learn More

- [Main README](../../README.md)
- [LeanMCP Core Package](../../packages/core/)
