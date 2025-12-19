
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, Toaster } from '@leanmcp/ui';
import '@leanmcp/ui/styles.css';
import './styles.css';
import { ChannelsList } from '../mcp/slack/ChannelsList';

const APP_INFO = {
    name: 'ChannelsList',
    version: '1.0.0'
};

function App() {
    return (
        <AppProvider appInfo={APP_INFO}>
            <ChannelsList />
            <Toaster />
        </AppProvider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
