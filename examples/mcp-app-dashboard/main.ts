import { createHTTPServer } from "@leanmcp/core";

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
    name: "mcp-app-dashboard",
    version: "1.0.0",
    port: 3102,
    cors: true,
    logging: true
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║           MCP App Dashboard - Server Running                 ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log("║  MCP Endpoint:  http://localhost:3102/mcp                    ║");
console.log("║  Dashboard:     http://localhost:3102/mcp (in host)          ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log("\nAvailable Tools:");
console.log("  • listProducts    - List products with pagination");
console.log("  • getProduct      - Get single product by ID");
console.log("  • createProduct   - Create new product");
console.log("  • updateProduct   - Update existing product");
console.log("  • deleteProduct   - Delete product");
console.log("  • getStats        - Get dashboard statistics");
