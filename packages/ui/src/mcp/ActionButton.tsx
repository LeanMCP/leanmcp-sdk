import React, { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '../core/Button';
import { useTool } from './useTool';

export interface ActionButtonProps extends Omit<ButtonProps, 'onClick' | 'loading' | 'onError'> {
  /** Tool name to call */
  toolName: string;
  /** Arguments to pass to the tool */
  toolArgs?: Record<string, unknown>;
  /** Callback when tool call succeeds */
  onToolSuccess?: (result: unknown) => void;
  /** Callback when tool call fails */
  onToolError?: (error: Error) => void;
  /** Show result inline after success */
  showResult?: boolean;
  /** Custom result renderer */
  renderResult?: (result: unknown) => ReactNode;
}

/**
 * ActionButton - Button that calls an MCP tool with loading state
 *
 * @example
 * ```tsx
 * <ActionButton
 *   toolName="get-weather"
 *   toolArgs={{ city: 'London' }}
 *   onToolSuccess={(data) => console.log(data)}
 * >
 *   Get Weather
 * </ActionButton>
 * ```
 */
export function ActionButton({
  toolName,
  toolArgs = {},
  onToolSuccess,
  onToolError,
  showResult = false,
  renderResult,
  children,
  ...buttonProps
}: ActionButtonProps) {
  const { call, loading, result, error } = useTool(toolName);
  const [hasResult, setHasResult] = useState(false);

  const handleClick = async () => {
    try {
      const res = await call(toolArgs);
      setHasResult(true);
      onToolSuccess?.(res);
    } catch (err) {
      onToolError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return (
    <div className="lui-action-button-wrapper">
      <Button {...buttonProps} loading={loading} onClick={handleClick}>
        {children}
      </Button>
      {showResult && hasResult && result !== null && (
        <div className="lui-action-button-result">
          {renderResult ? renderResult(result) : <pre>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      )}
      {error && <div className="lui-action-button-error">{error.message}</div>}
    </div>
  );
}
