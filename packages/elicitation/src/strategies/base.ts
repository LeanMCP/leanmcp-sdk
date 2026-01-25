import {
  ElicitationRequest,
  ElicitationResponse,
  ElicitationField,
  ValidationError,
  ElicitationConfig,
  ElicitationContext,
} from '../types';

/**
 * Base class for elicitation strategies
 * Extend this class to implement custom elicitation strategies
 */
export abstract class ElicitationStrategyBase {
  /**
   * Build an elicitation request from configuration and context
   */
  abstract buildRequest(config: ElicitationConfig, context: ElicitationContext): ElicitationRequest;

  /**
   * Validate user response against field definitions
   */
  validateResponse(response: ElicitationResponse, fields: ElicitationField[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      const value = response.values[field.name];

      // Required validation
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          message: field.validation?.errorMessage || `${field.label} is required`,
        });
        continue;
      }

      // Skip further validation if value is not provided and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type-specific validation
      const typeError = this.validateFieldType(value, field);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Custom validation
      if (field.validation) {
        const validationError = this.validateField(value, field);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    return errors;
  }

  /**
   * Validate field type
   */
  protected validateFieldType(value: any, field: ElicitationField): ValidationError | null {
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return {
            field: field.name,
            message: `${field.label} must be a number`,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: field.name,
            message: `${field.label} must be true or false`,
          };
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return {
            field: field.name,
            message: `${field.label} must be a valid email address`,
          };
        }
        break;

      case 'url':
        try {
          new URL(String(value));
        } catch {
          return {
            field: field.name,
            message: `${field.label} must be a valid URL`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Validate field against validation rules
   */
  protected validateField(value: any, field: ElicitationField): ValidationError | null {
    const validation = field.validation;
    if (!validation) return null;

    // Min/Max for numbers
    if (field.type === 'number') {
      const numValue = Number(value);
      if (validation.min !== undefined && numValue < validation.min) {
        return {
          field: field.name,
          message: validation.errorMessage || `${field.label} must be at least ${validation.min}`,
        };
      }
      if (validation.max !== undefined && numValue > validation.max) {
        return {
          field: field.name,
          message: validation.errorMessage || `${field.label} must be at most ${validation.max}`,
        };
      }
    }

    // MinLength/MaxLength for strings
    if (
      field.type === 'text' ||
      field.type === 'textarea' ||
      field.type === 'email' ||
      field.type === 'url'
    ) {
      const strValue = String(value);
      if (validation.minLength !== undefined && strValue.length < validation.minLength) {
        return {
          field: field.name,
          message:
            validation.errorMessage ||
            `${field.label} must be at least ${validation.minLength} characters`,
        };
      }
      if (validation.maxLength !== undefined && strValue.length > validation.maxLength) {
        return {
          field: field.name,
          message:
            validation.errorMessage ||
            `${field.label} must be at most ${validation.maxLength} characters`,
        };
      }
    }

    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(value))) {
        return {
          field: field.name,
          message: validation.errorMessage || `${field.label} format is invalid`,
        };
      }
    }

    // Custom validator
    if (validation.customValidator) {
      const result = validation.customValidator(value);
      if (result !== true) {
        return {
          field: field.name,
          message:
            typeof result === 'string'
              ? result
              : validation.errorMessage || `${field.label} is invalid`,
        };
      }
    }

    return null;
  }

  /**
   * Merge elicited values with original arguments
   */
  mergeWithArgs(originalArgs: any, elicitedValues: Record<string, any>): any {
    return { ...originalArgs, ...elicitedValues };
  }
}
