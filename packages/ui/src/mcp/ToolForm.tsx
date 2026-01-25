/**
 * ToolForm - Form component with MCP tool integration
 *
 * Features:
 * - Manual field configuration
 * - Auto-generate form from tool JSON schema
 * - Built-in validation
 * - Loading and result states
 * - Success/error callbacks
 *
 * @example Manual field definition
 * ```tsx
 * <ToolForm
 *   toolName="create-user"
 *   fields={[
 *     { name: 'name', label: 'Name', required: true },
 *     { name: 'email', label: 'Email', type: 'email', required: true },
 *   ]}
 *   submitText="Create User"
 *   onSuccess={(user) => console.log('Created:', user)}
 * />
 * ```
 *
 * @example Auto-generate from schema
 * ```tsx
 * <ToolForm
 *   toolName="create-item"
 *   autoSchema
 *   submitText="Create"
 * />
 * ```
 */
'use client';

import * as React from 'react';
import { useState, useEffect, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTool } from './useTool';
import { useMcpApp } from './AppProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Form field definition
 */
export interface ToolFormField {
  /** Field name (matches tool input schema) */
  name: string;
  /** Display label */
  label: string;
  /** Input type */
  type?:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'switch'
    | 'slider';
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: string | number | boolean;
  /** Required field */
  required?: boolean;
  /** Helper text */
  description?: string;
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Min value for number/slider */
  min?: number;
  /** Max value for number/slider */
  max?: number;
  /** Step for number/slider */
  step?: number;
  /** Disable field */
  disabled?: boolean;
}

/**
 * JSON Schema property definition (simplified)
 */
interface JsonSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: string;
}

/**
 * Tool input schema (simplified)
 */
interface ToolInputSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * ToolForm props
 */
export interface ToolFormProps {
  /** Tool name to call on submit */
  toolName: string;
  /** Form fields (optional if autoSchema) */
  fields?: ToolFormField[];
  /** Auto-generate form from tool schema */
  autoSchema?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Loading text */
  loadingText?: string;
  /** Callback when tool call succeeds */
  onSuccess?: (result: unknown) => void;
  /** Callback when tool call fails */
  onError?: (error: Error) => void;
  /** Show result after success */
  showResult?: boolean;
  /** Show toast on success */
  showSuccessToast?: boolean;
  /** Success message */
  successMessage?: string | ((result: unknown) => string);
  /** Reset form on success */
  resetOnSuccess?: boolean;
  /** Additional class name */
  className?: string;
  /** Layout - vertical or horizontal */
  layout?: 'vertical' | 'horizontal';
}

/**
 * Convert JSON schema property to ToolFormField
 */
function schemaPropertyToField(
  name: string,
  prop: JsonSchemaProperty,
  required: boolean
): ToolFormField {
  let type: ToolFormField['type'] = 'text';

  // Determine type from schema
  if (prop.type === 'boolean') {
    type = 'switch';
  } else if (prop.type === 'integer' || prop.type === 'number') {
    type = 'number';
  } else if (prop.enum && prop.enum.length > 0) {
    type = 'select';
  } else if (prop.format === 'email') {
    type = 'email';
  } else if (prop.format === 'password') {
    type = 'password';
  } else if (prop.maxLength && prop.maxLength > 100) {
    type = 'textarea';
  }

  return {
    name,
    label: prop.title ?? name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'),
    type,
    placeholder: prop.description,
    defaultValue: prop.default as string | number | boolean | undefined,
    required,
    description: prop.description,
    options: prop.enum?.map((v) => ({ value: v, label: v })),
    min: prop.minimum,
    max: prop.maximum,
  };
}

/**
 * ToolForm component
 */
export function ToolForm({
  toolName,
  fields: manualFields,
  autoSchema = false,
  submitText = 'Submit',
  loadingText,
  onSuccess,
  onError,
  showResult = false,
  showSuccessToast = false,
  successMessage,
  resetOnSuccess = false,
  className,
  layout = 'vertical',
}: ToolFormProps) {
  const { app, isConnected } = useMcpApp();
  const { call, loading, result, error, reset } = useTool(toolName, {
    onSuccess: (result) => {
      onSuccess?.(result);
      if (showSuccessToast) {
        const message =
          typeof successMessage === 'function'
            ? successMessage(result)
            : (successMessage ?? 'Form submitted successfully');
        toast.success(message);
      }
      if (resetOnSuccess) {
        resetForm();
      }
    },
    onError,
  });

  const [fields, setFields] = useState<ToolFormField[]>(manualFields ?? []);
  const [schemaLoading, setSchemaLoading] = useState(autoSchema);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  /**
   * Initialize form data from fields
   */
  const initializeFormData = (fields: ToolFormField[]) => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox' || field.type === 'switch') {
        initial[field.name] = false;
      } else if (field.type === 'number' || field.type === 'slider') {
        initial[field.name] = field.min ?? 0;
      } else {
        initial[field.name] = '';
      }
    });
    setFormData(initial);
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    initializeFormData(fields);
    reset();
  };

  // Load schema if autoSchema is enabled
  useEffect(() => {
    if (autoSchema && app && isConnected) {
      setSchemaLoading(true);

      // Attempt to get tool schema via listTools
      // Note: This is a simplified implementation
      // Real implementation would use app.listTools() or similar
      const fetchSchema = async () => {
        try {
          // This would need to be implemented in AppProvider
          // For now, use manual fields as fallback
          console.warn('[ToolForm] Auto-schema not fully implemented, use manual fields');
          if (manualFields) {
            setFields(manualFields);
            initializeFormData(manualFields);
          }
        } catch (err) {
          console.error('[ToolForm] Failed to fetch schema:', err);
        } finally {
          setSchemaLoading(false);
        }
      };

      fetchSchema();
    } else if (manualFields) {
      setFields(manualFields);
      initializeFormData(manualFields);
    }
  }, [autoSchema, app, isConnected, manualFields, toolName]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Build args with proper types
    const args: Record<string, unknown> = {};
    fields.forEach((field) => {
      let value = formData[field.name];

      if (field.type === 'number' || field.type === 'slider') {
        value = Number(value);
      }

      args[field.name] = value;
    });

    await call(args);
  };

  /**
   * Handle field change
   */
  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Render a single field
   */
  const renderField = (field: ToolFormField) => {
    const value = formData[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled || loading}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={(value as string) ?? ''}
            onValueChange={(v) => handleChange(field.name, v)}
            disabled={field.disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder ?? 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
              disabled={field.disabled || loading}
            />
            <label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </label>
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.name}
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
              disabled={field.disabled || loading}
            />
            <Label htmlFor={field.name}>{field.label}</Label>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{field.min ?? 0}</span>
              <span>{(value as number) ?? field.min ?? 0}</span>
              <span>{field.max ?? 100}</span>
            </div>
            <Slider
              value={[(value as number) ?? field.min ?? 0]}
              onValueChange={([v]) => handleChange(field.name, v)}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              disabled={field.disabled || loading}
            />
          </div>
        );

      case 'number':
        return (
          <Input
            id={field.name}
            type="number"
            placeholder={field.placeholder}
            value={(value as number) ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={field.disabled || loading}
            required={field.required}
          />
        );

      default:
        return (
          <Input
            id={field.name}
            type={field.type ?? 'text'}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled || loading}
            required={field.required}
          />
        );
    }
  };

  // Loading schema
  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form className={cn('space-y-4', className)} onSubmit={handleSubmit}>
      <div className={cn('space-y-4', layout === 'horizontal' && 'grid grid-cols-2 gap-4')}>
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            {field.type !== 'checkbox' && field.type !== 'switch' && (
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {renderField(field)}
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {loadingText ?? 'Submitting...'}
            </>
          ) : (
            submitText
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {showResult && result !== null && (
        <div className="rounded-md bg-muted p-4">
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </form>
  );
}
