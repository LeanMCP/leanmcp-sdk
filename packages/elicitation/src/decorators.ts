import "reflect-metadata";
import {
  ElicitationConfig,
  ElicitationContext,
  ElicitationRequest,
  ElicitationStep
} from './types';
import { FormElicitationStrategy } from './strategies/form';
import { MultiStepElicitationStrategy } from './strategies/multi-step';

/**
 * Check if method arguments are missing required fields
 */
export function checkMissingFields(args: any, config: ElicitationConfig): boolean {
  if (!config.fields) return false;

  for (const field of config.fields) {
    if (field.required) {
      const value = args[field.name];
      if (value === undefined || value === null || value === '') {
        return true; // Missing required field
      }
    }
  }

  return false;
}

/**
 * Decorator to mark a method as requiring elicitation
 * 
 * @example
 * // Simple form elicitation
 * @Tool({ description: 'Create Slack channel' })
 * @Elicitation({
 *   title: 'Create Channel',
 *   fields: [
 *     { name: 'channelName', label: 'Channel Name', type: 'text', required: true },
 *     { name: 'isPrivate', label: 'Private Channel', type: 'boolean', defaultValue: false }
 *   ]
 * })
 * async createChannel(args: CreateChannelInput) {
 *   // Method receives complete args after elicitation
 * }
 * 
 * @example
 * // Conditional elicitation
 * @Tool({ description: 'Send message' })
 * @Elicitation({
 *   condition: (args) => !args.channelId,
 *   title: 'Select Channel',
 *   fields: [
 *     { name: 'channelId', label: 'Channel', type: 'select', required: true }
 *   ]
 * })
 * async sendMessage(args: SendMessageInput) {
 *   // Only elicits if channelId is missing
 * }
 * 
 * @example
 * // Multi-step elicitation
 * @Tool({ description: 'Deploy app' })
 * @Elicitation({
 *   strategy: 'multi-step',
 *   builder: () => [
 *     {
 *       title: 'Step 1: Environment',
 *       fields: [{ name: 'env', label: 'Environment', type: 'select', required: true }]
 *     },
 *     {
 *       title: 'Step 2: Config',
 *       fields: [{ name: 'replicas', label: 'Replicas', type: 'number', defaultValue: 3 }]
 *     }
 *   ]
 * })
 * async deployApp(args: DeployConfig) {
 *   // Implementation
 * }
 */
export function Elicitation(config: ElicitationConfig): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error("@Elicitation can only be applied to methods");
    }

    const originalMethod = descriptor.value;

    // Store elicitation config in metadata
    Reflect.defineMetadata("elicitation:config", config, originalMethod);
    Reflect.defineMetadata("elicitation:enabled", true, originalMethod);

    // Store strategy type
    const strategy = config.strategy || 'form';
    Reflect.defineMetadata("elicitation:strategy", strategy, originalMethod);

    // Wrap the method to handle elicitation
    descriptor.value = async function(this: any, args: any, meta?: any) {
      // Check if elicitation is needed
      const context: ElicitationContext = {
        args: args || {},
        meta,
        previousAttempts: 0
      };

      // Check condition if provided
      if (config.condition && !config.condition(args || {})) {
        // Condition not met, skip elicitation
        return originalMethod.call(this, args, meta);
      }

      // Determine if elicitation is needed
      let needsElicitation = false;
      let fieldsToCheck: any[] = [];

      // If builder is provided, build the config first to get fields
      if (config.builder) {
        const builtConfig = config.builder(context);
        
        // If builder returns ElicitationConfig (from fluent builder)
        if (builtConfig && typeof builtConfig === 'object' && 'fields' in builtConfig) {
          fieldsToCheck = (builtConfig as any).fields || [];
        }
        // If builder returns steps array (multi-step)
        else if (Array.isArray(builtConfig)) {
          // For multi-step, check first step fields
          const firstStep = builtConfig[0];
          if (firstStep && firstStep.fields) {
            fieldsToCheck = firstStep.fields;
          }
        }
      } else if (config.fields) {
        fieldsToCheck = config.fields;
      }

      // Check if any required fields are missing
      for (const field of fieldsToCheck) {
        if (field.required) {
          const value = args[field.name];
          if (value === undefined || value === null || value === '') {
            needsElicitation = true;
            break;
          }
        }
      }

      if (needsElicitation) {
        // Build and return elicitation request
        const elicitationRequest = buildElicitationRequestInternal(config, context);
        
        // Return elicitation request (core will format it)
        return elicitationRequest;
      }

      // All required fields present, execute original method
      return originalMethod.call(this, args, meta);
    } as any;

    // Copy metadata from original to wrapped method
    if (descriptor.value && typeof descriptor.value === 'function') {
      copyMethodMetadata(originalMethod, descriptor.value as Function);
    }
  };
}

/**
 * Copy metadata from source to target
 */
function copyMethodMetadata(source: Function, target: Function) {
  const metadataKeys = Reflect.getMetadataKeys(source) || [];
  for (const key of metadataKeys) {
    const value = Reflect.getMetadata(key, source);
    if (value !== undefined) {
      Reflect.defineMetadata(key, value, target);
    }
  }
}

/**
 * Internal function to build elicitation request
 */
function buildElicitationRequestInternal(
  config: ElicitationConfig,
  context: ElicitationContext
): ElicitationRequest {
  // Use builder if provided
  if (config.builder) {
    const result = config.builder(context);
    
    // If builder returns steps array, use multi-step strategy
    if (Array.isArray(result)) {
      const strategy = new MultiStepElicitationStrategy(result as ElicitationStep[]);
      return strategy.buildRequest(config, context);
    }
    
    // If builder returns ElicitationConfig (from fluent builder)
    if (result && typeof result === 'object' && 'fields' in result) {
      const builtConfig = result as any;
      const strategy = new FormElicitationStrategy();
      return strategy.buildRequest(builtConfig, context);
    }
    
    // If builder returns ElicitationRequest directly
    return result as ElicitationRequest;
  }

  // Use strategy-based building
  const strategyType = config.strategy || 'form';
  
  switch (strategyType) {
    case 'form': {
      const strategy = new FormElicitationStrategy();
      return strategy.buildRequest(config, context);
    }
    
    case 'multi-step': {
      // For multi-step without builder, fields should be provided as steps
      if (!config.fields) {
        throw new Error("Multi-step elicitation requires either a builder or fields");
      }
      
      // Convert fields to a single step
      const steps: ElicitationStep[] = [{
        title: config.title || 'Step 1',
        description: config.description,
        fields: config.fields
      }];
      
      const strategy = new MultiStepElicitationStrategy(steps);
      return strategy.buildRequest(config, context);
    }
    
    default:
      throw new Error(`Unsupported elicitation strategy: ${strategyType}`);
  }
}

/**
 * Check if a method requires elicitation
 */
export function isElicitationEnabled(method: Function): boolean {
  return Reflect.getMetadata("elicitation:enabled", method) === true;
}

/**
 * Get elicitation configuration for a method
 */
export function getElicitationConfig(method: Function): ElicitationConfig | undefined {
  return Reflect.getMetadata("elicitation:config", method);
}

/**
 * Get elicitation strategy type for a method
 */
export function getElicitationStrategy(method: Function): string | undefined {
  return Reflect.getMetadata("elicitation:strategy", method);
}

/**
 * Build elicitation request from method metadata
 */
export function buildElicitationRequest(
  method: Function,
  args: any,
  meta?: any
): ElicitationRequest | null {
  const config = getElicitationConfig(method);
  if (!config) return null;

  const context: ElicitationContext = {
    args,
    meta,
    previousAttempts: 0
  };

  // Check condition if provided
  if (config.condition && !config.condition(args)) {
    return null; // Condition not met, no elicitation needed
  }

  // Use builder if provided
  if (config.builder) {
    const result = config.builder(context);
    
    // If builder returns steps, use multi-step strategy
    if (Array.isArray(result)) {
      const strategy = new MultiStepElicitationStrategy(result as ElicitationStep[]);
      return strategy.buildRequest(config, context);
    }
    
    // If builder returns request directly
    return result as ElicitationRequest;
  }

  // Use strategy-based building
  const strategyType = config.strategy || 'form';
  
  switch (strategyType) {
    case 'form': {
      const strategy = new FormElicitationStrategy();
      return strategy.buildRequest(config, context);
    }
    
    case 'multi-step': {
      // For multi-step without builder, fields should be provided as steps
      if (!config.fields) {
        throw new Error("Multi-step elicitation requires either a builder or fields");
      }
      
      // Convert fields to a single step
      const steps: ElicitationStep[] = [{
        title: config.title || 'Step 1',
        description: config.description,
        fields: config.fields
      }];
      
      const strategy = new MultiStepElicitationStrategy(steps);
      return strategy.buildRequest(config, context);
    }
    
    default:
      throw new Error(`Unsupported elicitation strategy: ${strategyType}`);
  }
}
