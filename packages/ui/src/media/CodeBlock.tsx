import React from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { clsx } from 'clsx';
import './CodeBlock.css';

export interface CodeBlockProps {
  /** Code content */
  code: string;
  /** Programming language */
  language?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Enable copy button */
  copyable?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * CodeBlock - Syntax highlighted code display
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   code={`const greeting = "Hello, World!";`}
 *   language="javascript"
 *   copyable
 * />
 * ```
 */
export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  copyable = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx('lui-code-block', className)}>
      {copyable && (
        <button
          type="button"
          className="lui-code-block-copy"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      )}
      <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={clsx('lui-code-block-pre', hlClassName)} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {showLineNumbers && <span className="lui-code-block-line-number">{i + 1}</span>}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
