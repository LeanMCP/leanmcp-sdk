import React, { useState, useEffect, useRef } from 'react';
import { Play, MessageSquare, Terminal } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

interface Log {
  type: 'info' | 'error' | 'success' | 'request' | 'response';
  message: string;
  timestamp: string;
  data?: any;
}

interface ElicitationRequest {
  type: 'elicitation';
  title: string;
  description?: string;
  fields: any[];
  metadata?: any;
}

function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [elicitationRequest, setElicitationRequest] = useState<ElicitationRequest | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const initializingRef = useRef<boolean>(false);

  const addLog = (type: Log['type'], message: string, data?: any) => {
    setLogs(prev => [{
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      data
    }, ...prev]);
  };

  const callMcp = async (method: string, params?: any, isNotification = false) => {
  try {
    addLog('request', `Calling ${method}`, params);
    
    if (sessionIdRef.current) {
      addLog('info', `Using session ID: ${sessionIdRef.current.substring(0, 8)}...`, null);
    } else {
      addLog('info', 'No session ID available', null);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream' // <-- REQUIRED by backend
    };

    if (sessionIdRef.current) {
      headers['mcp-session-id'] = sessionIdRef.current;
    }

    const requestBody: any = {
      jsonrpc: '2.0',
      method,
      params: params || {}
    };

    if (!isNotification) {
      requestBody.id = Date.now();
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    addLog('info', `Sending request to /mcp`, { 
      method: 'POST',
      headers: Object.keys(headers),
      bodyPreview: JSON.stringify(requestBody).substring(0, 100)
    });
    
    const response = await fetch('/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    addLog('info', `Received response`, {
      status: response.status,
      headers: Array.from(response.headers.entries()).slice(0, 5)
    });

    // Save session ID
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId && !sessionIdRef.current) {
      sessionIdRef.current = newSessionId;
      addLog('info', 'Session initialized', { sessionId: newSessionId });
    }

    const contentType = response.headers.get('content-type');
    addLog('info', `Content-Type for ${method}`, contentType);
    addLog('info', `Response status: ${response.status} ${response.statusText}`, null);

    // Notifications don't have responses - return immediately
    if (isNotification) {
      addLog('info', `Notification sent: ${method}`, null);
      return;
    }
    
    // Check for error status codes
    if (!response.ok) {
      const errorText = await response.text();
      addLog('error', `HTTP error ${response.status}`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Standard JSON response
    if (contentType?.includes('application/json')) {
      const data = await response.json();

      if (data.error) {
        addLog('error', `Error calling ${method}`, data.error);
        throw new Error(data.error.message);
      }

      addLog('response', `Response from ${method}`, data.result);
      return data.result;
    }

    // SSE Streaming response (or null content-type - MCP SDK default)
    if (contentType?.includes('text/event-stream') || !contentType) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        addLog('error', 'No reader available for SSE stream', null);
        return null;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const block of events) {
          if (block.includes('data: ')) {
            try {
              const dataLine = block.split('data: ')[1];
              const json = JSON.parse(dataLine);
              
              // Handle JSON-RPC response format
              if (json.error) {
                addLog('error', `Error calling ${method}`, json.error);
                throw new Error(json.error.message);
              }
              
              addLog('response', `SSE response from ${method}`, json.result);
              return json.result;  // Return the result field, not the full JSON-RPC response
            } catch (parseError) {
              // Only ignore JSON parse errors, re-throw other errors
              if (parseError instanceof SyntaxError) {
                addLog('error', 'Failed to parse SSE data', block);
                continue; // Invalid JSON, try next block
              }
              throw parseError; // Re-throw JSON-RPC errors
            }
          }
        }
      }
      
      // If we finished reading SSE but found nothing, log the buffer
      addLog('error', 'No valid SSE data found in stream', { 
        buffer: buffer.substring(0, 200), 
        length: buffer.length 
      });
      return null;
    }

    // Unexpected content type
    addLog('error', `Unexpected content-type: ${contentType}`, null);
    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      addLog('error', `Request timeout for ${method}`, { timeout: '10s' });
    } else {
      addLog('error', `Failed to call ${method}`, { 
        name: error.name, 
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
    }
    throw error;
  }
};



  const initMcp = async () => {
    // Prevent duplicate initialization (React StrictMode causes double renders)
    if (initializingRef.current) {
      addLog('info', 'Initialization already in progress, skipping', null);
      return;
    }
    
    initializingRef.current = true;
    
    try {
      // 1. Initialize
      await callMcp('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        },
        clientInfo: {
          name: 'SlackElicitationClient',
          version: '1.0.0'
        }
      });

      // 2. Notify initialized
      await callMcp('notifications/initialized', {}, true);

      // 3. Fetch tools
      await fetchTools();

    } catch (error) {
      console.error('Failed to initialize MCP:', error);
      initializingRef.current = false; // Reset on error
    }
  };

  const fetchTools = async () => {
    try {
      if (!sessionIdRef.current) {
        addLog('error', 'Cannot fetch tools: No session ID', null);
        return;
      }
      
      const result = await callMcp('tools/list');
      if (result && result.tools) {
        setTools(result.tools);
      } else {
        addLog('error', 'Invalid tools/list response', result);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    initMcp();
  }, []);

  const handleToolCall = async (toolName: string, args: any = {}) => {
    setLoading(true);
    setActiveTool(toolName);
    
    try {
      const result = await callMcp('tools/call', {
        name: toolName,
        arguments: args
      });

      // Check for elicitation
      if (result.content && result.content.length > 0) {
        const textContent = result.content[0].text;
        try {
          const parsed = JSON.parse(textContent);
          if (parsed.type === 'elicitation') {
            setElicitationRequest(parsed);
            // Preserve existing values if any
            setFormValues(prev => ({ ...prev, ...args }));
            addLog('info', 'Received elicitation request', parsed);
            return;
          }
        } catch (e) {
          // Not JSON or not elicitation, ignore
        }
      }

      // Success
      setElicitationRequest(null);
      setFormValues({});
      setActiveTool(null);
      addLog('success', `Tool ${toolName} executed successfully`, result);
    } catch (error) {
      // Error handled in callMcp
    } finally {
      setLoading(false);
    }
  };

  const handleElicitationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTool) {
      handleToolCall(activeTool, formValues);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Tools & Form */}
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Available Tools
            </h2>
            <div className="space-y-2">
              {tools.map(tool => (
                <button
                  key={tool.name}
                  onClick={() => handleToolCall(tool.name)}
                  className="w-full text-left p-3 rounded-md hover:bg-gray-50 border border-gray-100 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium text-gray-900">{tool.name}</div>
                    <div className="text-sm text-gray-500">{tool.description}</div>
                  </div>
                  <Play className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Elicitation Form */}
          {elicitationRequest && (
            <div className="bg-white rounded-lg shadow-md border border-blue-100 overflow-hidden">
              <div className="bg-blue-50 p-4 border-b border-blue-100">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {elicitationRequest.title}
                </h3>
                {elicitationRequest.description && (
                  <p className="text-blue-700 text-sm mt-1">{elicitationRequest.description}</p>
                )}
              </div>
              
              <form onSubmit={handleElicitationSubmit} className="p-6 space-y-4">
                {elicitationRequest.fields.map((field: any) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required={field.required}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center gap-2">
                         <input
                          type="checkbox"
                          checked={formValues[field.name] || false}
                          onChange={(e) => handleInputChange(field.name, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{field.helpText || field.label}</span>
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[100px]"
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}
                    
                    {field.validation?.errorMessage && (
                      <p className="text-xs text-gray-500 mt-1">{field.validation.errorMessage}</p>
                    )}
                  </div>
                ))}
                
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setElicitationRequest(null)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Logs */}
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-gray-100 font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Activity Log
            </h2>
            <button 
              onClick={() => setLogs([])}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'request' ? 'text-blue-400' : ''}
                    ${log.type === 'response' ? 'text-purple-400' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
                {log.data && (
                  <pre className="bg-gray-950 p-2 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-600 text-center mt-10">No activity yet</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
