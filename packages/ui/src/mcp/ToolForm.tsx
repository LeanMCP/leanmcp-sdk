import React, { useState, type FormEvent } from 'react';
import { Button } from '../core/Button';
import { Input } from '../core/Input';
import { useTool } from './useTool';
import { clsx } from 'clsx';
import './ToolForm.css';

export interface ToolFormField {
    /** Field name (matches tool input schema) */
    name: string;
    /** Display label */
    label: string;
    /** Input type */
    type?: 'text' | 'number' | 'email' | 'password' | 'textarea';
    /** Placeholder text */
    placeholder?: string;
    /** Default value */
    defaultValue?: string | number;
    /** Required field */
    required?: boolean;
    /** Helper text */
    helperText?: string;
}

export interface ToolFormProps {
    /** Tool name to call on submit */
    toolName: string;
    /** Form fields */
    fields: ToolFormField[];
    /** Submit button text */
    submitText?: string;
    /** Callback when tool call succeeds */
    onSuccess?: (result: unknown) => void;
    /** Callback when tool call fails */
    onError?: (error: Error) => void;
    /** Show result after success */
    showResult?: boolean;
    /** Additional class name */
    className?: string;
}

/**
 * ToolForm - Auto-generates a form that submits to an MCP tool
 * 
 * @example
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
 */
export function ToolForm({
    toolName,
    fields,
    submitText = 'Submit',
    onSuccess,
    onError,
    showResult = false,
    className,
}: ToolFormProps) {
    const { call, loading, result, error } = useTool(toolName);
    const [formData, setFormData] = useState<Record<string, string | number>>(() => {
        const initial: Record<string, string | number> = {};
        fields.forEach((field) => {
            if (field.defaultValue !== undefined) {
                initial[field.name] = field.defaultValue;
            }
        });
        return initial;
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Convert number types
        const args: Record<string, unknown> = {};
        fields.forEach((field) => {
            const value = formData[field.name];
            if (field.type === 'number' && value !== undefined) {
                args[field.name] = Number(value);
            } else {
                args[field.name] = value;
            }
        });

        try {
            const res = await call(args);
            onSuccess?.(res);
        } catch (err) {
            onError?.(err instanceof Error ? err : new Error(String(err)));
        }
    };

    const handleChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <form className={clsx('lui-tool-form', className)} onSubmit={handleSubmit}>
            <div className="lui-tool-form-fields">
                {fields.map((field) => (
                    <div key={field.name} className="lui-tool-form-field">
                        {field.type === 'textarea' ? (
                            <div className="lui-input-wrapper lui-input-wrapper--full-width">
                                <label className="lui-input-label">{field.label}</label>
                                <textarea
                                    className="lui-tool-form-textarea"
                                    name={field.name}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                />
                                {field.helperText && (
                                    <p className="lui-input-message">{field.helperText}</p>
                                )}
                            </div>
                        ) : (
                            <Input
                                fullWidth
                                label={field.label}
                                type={field.type ?? 'text'}
                                name={field.name}
                                placeholder={field.placeholder}
                                required={field.required}
                                helperText={field.helperText}
                                value={formData[field.name] ?? ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="lui-tool-form-actions">
                <Button type="submit" loading={loading}>
                    {submitText}
                </Button>
            </div>

            {error && (
                <div className="lui-tool-form-error">
                    {error.message}
                </div>
            )}

            {showResult && result !== null && (
                <div className="lui-tool-form-result">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </form>
    );
}
