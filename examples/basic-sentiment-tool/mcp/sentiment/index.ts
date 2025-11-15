import { Tool, Optional, SchemaConstraint } from "@leanmcp/core";

// ============================================================================
// Type-Safe Input/Output Classes
// ============================================================================

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

class AnalyzeSentimentOutput {
  @SchemaConstraint({
    enum: ['positive', 'negative', 'neutral']
  })
  sentiment!: string;
  
  @SchemaConstraint({
    minimum: -1,
    maximum: 1
  })
  score!: number;
  
  @SchemaConstraint({
    minimum: 0,
    maximum: 1
  })
  confidence!: number;
  
  language!: string;
}

/**
 * Sentiment Analysis Service
 * 
 * Demonstrates the new @Tool decorator with automatic type inference
 */
export class SentimentAnalysisService {
  /**
   * Analyze sentiment of text
   * 
   * - Tool name: "analyzeSentiment" (inferred from function name)
   * - Input schema: Explicitly defined via AnalyzeSentimentInput class
   * - Output schema: Inferred from Promise<AnalyzeSentimentOutput> return type
   */
  @Tool({ 
    description: 'Analyze sentiment of text',
    inputClass: AnalyzeSentimentInput
  })
  async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
    // Simple sentiment analysis logic
    const sentiment = this.detectSentiment(args.text);
    
    return {
      sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
      score: sentiment,
      confidence: Math.abs(sentiment),
      language: args.language || 'en'
    };
  }
  
  /**
   * Get sentiment statistics
   * Simple tool with no input parameters
   */
  @Tool({ 
    description: 'Get sentiment analysis statistics'
  })
  async getSentimentStats(): Promise<{
    totalAnalyses: number;
    avgProcessingTime: number;
    supportedLanguages: string[];
    lastUpdated: string;
  }> {
    return {
      totalAnalyses: 1000,
      avgProcessingTime: 45,
      supportedLanguages: ['en', 'es', 'fr', 'de'],
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get service information
   */
  @Tool({ 
    description: 'Get service information'
  })
  async getServiceInfo() {
    return {
      name: "Sentiment Analysis Service",
      version: "1.0.0",
      description: "Provides sentiment analysis for text using keyword matching",
      features: [
        "Sentiment detection (positive, negative, neutral)",
        "Confidence scoring",
        "Multi-language support (planned)"
      ]
    };
  }
  
  private detectSentiment(text: string): number {
    // Simple mock implementation
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'poor'];
    
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.3;
      if (negativeWords.includes(word)) score -= 0.3;
    });
    
    return Math.max(-1, Math.min(1, score));
  }
}
