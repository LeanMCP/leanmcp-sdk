import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname, 'testing'),
    resolve: {
        alias: [
            // shadcn path aliases - must come first
            { find: '@/components', replacement: path.resolve(__dirname, 'src/components') },
            { find: '@/lib', replacement: path.resolve(__dirname, 'src/lib') },
            { find: '@/types', replacement: path.resolve(__dirname, 'src/types') },
            // Package aliases
            { find: '@leanmcp/ui/styles.css', replacement: path.resolve(__dirname, 'src/styles/styles.css') },
            { find: '@leanmcp/ui/testing', replacement: path.resolve(__dirname, 'src/testing.ts') },
            { find: '@leanmcp/ui', replacement: path.resolve(__dirname, 'src/index.ts') },
        ],
    },
    server: {
        port: 3001,
        // Ensure changes in src/ trigger HMR even though root is testing/
        watch: {
            ignored: ['!**/src/**'],
        },
    },
});
