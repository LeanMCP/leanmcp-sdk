# Basic Sentiment Analysis Example

A complete working example demonstrating LeanMCP's HTTP server with type-safe schema classes and sentiment analysis.

## Features Demonstrated

- HTTP server with Streamable HTTP transport
- Type-safe input/output schemas using TypeScript classes
- Schema constraints with validation rules
- Optional parameters with `@Optional()` decorator
- Multiple tools in one service class
- Automatic tool registration

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

The server will start on `http://localhost:8080` with the following endpoints:
- **MCP endpoint**: `http://localhost:8080/mcp`
- **Health check**: `http://localhost:8080/health`

## Registered Tools

- `analyzeSentiment` - Analyze sentiment of text
- `getSentimentStats` - Get service statistics
- `getServiceInfo` - Get service information

## Testing

You can test the tool by sending HTTP POST requests to `http://localhost:8080/mcp`:

### Analyze Sentiment

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analyzeSentiment",
      "arguments": {
        "text": "This is a great day!",
        "language": "en"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"sentiment\":\"positive\",\"score\":0.6,\"confidence\":0.6,\"language\":\"en\"}"
    }]
  }
}
```

### Get Statistics

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getSentimentStats",
      "arguments": {}
    }
  }'
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "getSentimentStats",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "totalAnalyses": 1000,
  "avgProcessingTime": 45,
  "supportedLanguages": ["en", "es", "fr", "de"],
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## Code Structure

### Input Schema Class

```typescript
class AnalyzeSentimentInput {
  @SchemaConstraint({
    description: 'Text to analyze',
    minLength: 1
  })
  text!: string;
  
  @Optional()
  @SchemaConstraint({
    description: 'Language code',
    enum: ['en', 'es', 'fr', 'de'],
    default: 'en'
  })
  language?: string;
}
```

### Output Schema Class

```typescript
class AnalyzeSentimentOutput {
  @SchemaConstraint({ enum: ['positive', 'negative', 'neutral'] })
  sentiment!: string;
  
  @SchemaConstraint({ minimum: -1, maximum: 1 })
  score!: number;
  
  @SchemaConstraint({ minimum: 0, maximum: 1 })
  confidence!: number;
  
  language!: string;
}
```

### Tool Implementation

```typescript
export class SentimentAnalysisService {
  @Tool({ description: 'Analyze sentiment of text' })
  async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
    const sentiment = this.detectSentiment(args.text);
    
    return {
      sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
      score: sentiment,
      confidence: Math.abs(sentiment),
      language: args.language || 'en'
    };
  }
}
```

## Key Concepts

### 1. Automatic Naming
Function name becomes the tool name:
```typescript
@Tool({ description: 'Analyze sentiment' })
async analyzeSentiment(...) { }
// Tool name: "analyzeSentiment"
```

### 2. Type Inference
Schemas are inferred from TypeScript types:
```typescript
async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput>
// Input schema: from AnalyzeSentimentInput class
// Output schema: from AnalyzeSentimentOutput class
```

### 3. Schema Constraints
Validation rules defined once in class properties:
```typescript
@SchemaConstraint({ minLength: 1 })
text!: string;
```

### 4. Optional Fields
Use `@Optional()` decorator:
```typescript
@Optional()
language?: string;
```

## Project Structure

```
basic-sentiment-tool/
├── main.ts              # Entry point - starts MCP server
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── README.md           # This file
└── mcp/
    └── sentiment/
        └── index.ts     # Sentiment analysis service
```

## Next Steps

- Add more complex validation with `@SchemaConstraint`
- Integrate with real sentiment analysis APIs
- Add authentication with `@Auth`
- Create more tools in the same service

## Learn More

- [Main README](../../README.md)
- [LeanMCP Core Package](../../packages/core/)
