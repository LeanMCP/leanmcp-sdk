import {
  ElicitationConfig,
  ElicitationField,
  FieldValidation
} from '../types';

/**
 * Fluent builder for creating elicitation forms
 * 
 * @example
 * const config = new ElicitationFormBuilder()
 *   .title('Create Slack Channel')
 *   .description('Please provide channel details')
 *   .addTextField('channelName', 'Channel Name', { required: true })
 *   .addBooleanField('isPrivate', 'Private Channel', { defaultValue: false })
 *   .addSelectField('team', 'Team', [
 *     { label: 'Engineering', value: 'eng' },
 *     { label: 'Marketing', value: 'mkt' }
 *   ])
 *   .build();
 */
export class ElicitationFormBuilder {
  private fields: ElicitationField[] = [];
  private config: Partial<ElicitationConfig> = {};

  /**
   * Set the form title
   */
  title(title: string): this {
    this.config.title = title;
    return this;
  }

  /**
   * Set the form description
   */
  description(description: string): this {
    this.config.description = description;
    return this;
  }

  /**
   * Set a condition for when elicitation should occur
   */
  condition(condition: (args: any) => boolean): this {
    this.config.condition = condition;
    return this;
  }

  /**
   * Add a text field
   */
  addTextField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'text',
      ...options
    });
    return this;
  }

  /**
   * Add a textarea field
   */
  addTextAreaField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'textarea',
      ...options
    });
    return this;
  }

  /**
   * Add a number field
   */
  addNumberField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'number',
      ...options
    });
    return this;
  }

  /**
   * Add a boolean field (checkbox)
   */
  addBooleanField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'boolean',
      ...options
    });
    return this;
  }

  /**
   * Add a select field (dropdown)
   */
  addSelectField(
    name: string,
    label: string,
    options: Array<{ label: string; value: any }>,
    fieldOptions?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type' | 'options'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'select',
      options,
      ...fieldOptions
    });
    return this;
  }

  /**
   * Add a multi-select field
   */
  addMultiSelectField(
    name: string,
    label: string,
    options: Array<{ label: string; value: any }>,
    fieldOptions?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type' | 'options'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'multiselect',
      options,
      ...fieldOptions
    });
    return this;
  }

  /**
   * Add an email field
   */
  addEmailField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'email',
      ...options
    });
    return this;
  }

  /**
   * Add a URL field
   */
  addUrlField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'url',
      ...options
    });
    return this;
  }

  /**
   * Add a date field
   */
  addDateField(
    name: string,
    label: string,
    options?: Partial<Omit<ElicitationField, 'name' | 'label' | 'type'>>
  ): this {
    this.fields.push({
      name,
      label,
      type: 'date',
      ...options
    });
    return this;
  }

  /**
   * Add a custom field with full control
   */
  addCustomField(field: ElicitationField): this {
    this.fields.push(field);
    return this;
  }

  /**
   * Build the final configuration
   */
  build(): ElicitationConfig {
    return {
      ...this.config,
      fields: this.fields,
      strategy: 'form'
    };
  }
}

/**
 * Helper function to create validation rules
 */
export class ValidationBuilder {
  private validation: FieldValidation = {};

  min(min: number): this {
    this.validation.min = min;
    return this;
  }

  max(max: number): this {
    this.validation.max = max;
    return this;
  }

  minLength(minLength: number): this {
    this.validation.minLength = minLength;
    return this;
  }

  maxLength(maxLength: number): this {
    this.validation.maxLength = maxLength;
    return this;
  }

  pattern(pattern: string): this {
    this.validation.pattern = pattern;
    return this;
  }

  customValidator(validator: (value: any) => boolean | string): this {
    this.validation.customValidator = validator;
    return this;
  }

  errorMessage(message: string): this {
    this.validation.errorMessage = message;
    return this;
  }

  build(): FieldValidation {
    return this.validation;
  }
}

/**
 * Helper to create validation rules
 */
export function validation(): ValidationBuilder {
  return new ValidationBuilder();
}
