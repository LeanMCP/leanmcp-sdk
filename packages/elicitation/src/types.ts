import 'reflect-metadata';

/**
 * Elicitation request structure following MCP spec
 */
export interface ElicitationRequest {
  type: 'elicitation';
  title: string;
  description?: string;
  fields: ElicitationField[];
  metadata?: {
    stepNumber?: number;
    totalSteps?: number;
    previousValues?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Individual field in elicitation form
 */
export interface ElicitationField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'email'
    | 'url'
    | 'textarea';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: FieldValidation;
  placeholder?: string;
  helpText?: string;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean | string;
  errorMessage?: string;
}

/**
 * Elicitation response from user
 */
export interface ElicitationResponse {
  values: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Strategy configuration
 */
export interface ElicitationStrategyConfig {
  strategy: 'form' | 'conversational' | 'multi-step';
  onComplete?: (values: Record<string, any>) => void;
  onValidationError?: (errors: ValidationError[]) => void;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Elicitation configuration for decorator
 */
export interface ElicitationConfig {
  strategy?: 'form' | 'conversational' | 'multi-step';
  title?: string;
  description?: string;
  fields?: ElicitationField[];
  condition?: (args: any) => boolean;
  builder?: (context: ElicitationContext) => ElicitationRequest | ElicitationStep[];
}

/**
 * Context passed to elicitation builder
 */
export interface ElicitationContext {
  args: any;
  meta?: any;
  previousAttempts?: number;
}

/**
 * Multi-step elicitation step
 */
export interface ElicitationStep {
  title: string;
  description?: string;
  fields: ElicitationField[];
  condition?: (previousValues: Record<string, any>) => boolean;
}

/**
 * Elicitation error
 */
export class ElicitationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ElicitationError';
  }
}
