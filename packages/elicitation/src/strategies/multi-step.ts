import { ElicitationStrategyBase } from './base';
import {
  ElicitationRequest,
  ElicitationConfig,
  ElicitationContext,
  ElicitationStep,
} from '../types';

/**
 * Multi-step elicitation strategy
 * Breaks elicitation into multiple sequential steps
 */
export class MultiStepElicitationStrategy extends ElicitationStrategyBase {
  private steps: ElicitationStep[];
  private currentStep: number = 0;
  private accumulatedValues: Record<string, any> = {};

  constructor(steps: ElicitationStep[]) {
    super();
    this.steps = steps;
  }

  buildRequest(config: ElicitationConfig, context: ElicitationContext): ElicitationRequest {
    // Find the next applicable step
    while (this.currentStep < this.steps.length) {
      const step = this.steps[this.currentStep];

      // Check if step condition is met
      if (!step.condition || step.condition(this.accumulatedValues)) {
        return {
          type: 'elicitation',
          title: step.title,
          description: step.description,
          fields: step.fields,
          metadata: {
            strategy: 'multi-step',
            stepNumber: this.currentStep + 1,
            totalSteps: this.steps.length,
            previousValues: { ...context.args, ...this.accumulatedValues },
          },
        };
      }

      // Skip this step if condition is not met
      this.currentStep++;
    }

    // No more steps, return empty request (shouldn't happen in normal flow)
    return {
      type: 'elicitation',
      title: 'Complete',
      description: 'All steps completed',
      fields: [],
      metadata: {
        strategy: 'multi-step',
        stepNumber: this.steps.length,
        totalSteps: this.steps.length,
        previousValues: this.accumulatedValues,
      },
    };
  }

  /**
   * Check if there are more steps
   */
  hasNextStep(): boolean {
    return this.currentStep < this.steps.length - 1;
  }

  /**
   * Move to next step and accumulate values
   */
  nextStep(values: Record<string, any>): void {
    this.accumulatedValues = { ...this.accumulatedValues, ...values };
    this.currentStep++;
  }

  /**
   * Get all accumulated values
   */
  getAccumulatedValues(): Record<string, any> {
    return { ...this.accumulatedValues };
  }

  /**
   * Reset to first step
   */
  reset(): void {
    this.currentStep = 0;
    this.accumulatedValues = {};
  }

  /**
   * Override merge to include all accumulated values
   */
  mergeWithArgs(originalArgs: any, elicitedValues: Record<string, any>): any {
    return { ...originalArgs, ...this.accumulatedValues, ...elicitedValues };
  }
}
