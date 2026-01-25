import { useSyncExternalStore } from 'react';

// Define the shape of window.openai globals we want to track
// Based on: https://developers.openai.com/apps-sdk/build/chatgpt-ui#list-of-capabilities
export interface OpenAiGlobals {
  toolInput: Record<string, unknown>;
  toolOutput: any; // structuredContent
  toolResponseMetadata: Record<string, unknown>; // _meta
  widgetState: Record<string, unknown>;
  theme: 'light' | 'dark';
  displayMode: 'inline' | 'modal' | 'fullscreen';
  maxHeight: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
  view: 'desktop' | 'mobile';
  locale: string;
}

const SET_GLOBALS_EVENT_TYPE = 'openai:set_globals';

interface SetGlobalsEvent extends Event {
  detail: {
    globals: Partial<OpenAiGlobals>;
  };
}

/**
 * React hook to subscribe to window.openai global values.
 * Source: https://developers.openai.com/apps-sdk/build/chatgpt-ui#useopenaiglobal
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] | undefined {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: Event) => {
        const customEvent = event as SetGlobalsEvent;
        const value = customEvent.detail?.globals?.[key];
        if (value !== undefined) {
          onChange();
        }
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, { passive: true });
      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => (window.openai as any)?.[key]
  );
}
