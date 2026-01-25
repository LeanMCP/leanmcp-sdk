import { ElicitationStrategyBase } from './base';
import { ElicitationRequest, ElicitationConfig, ElicitationContext } from '../types';

/**
 * Form-based elicitation strategy
 * Presents all fields at once in a single form
 */
export class FormElicitationStrategy extends ElicitationStrategyBase {
  buildRequest(config: ElicitationConfig, context: ElicitationContext): ElicitationRequest {
    return {
      type: 'elicitation',
      title: config.title || 'Additional Information Required',
      description: config.description,
      fields: config.fields || [],
      metadata: {
        strategy: 'form',
        previousValues: context.args,
      },
    };
  }
}
