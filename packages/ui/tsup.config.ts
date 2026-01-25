import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
    // Use automatic JSX runtime (React 17+)
    options.jsx = 'automatic';
  },
  // Copy CSS files (cross-platform)
  onSuccess:
    "node -e \"const fs=require('fs');const path=require('path');const src='src/styles';const dest='dist';if(fs.existsSync(src)){fs.readdirSync(src).filter(f=>f.endsWith('.css')).forEach(f=>fs.copyFileSync(path.join(src,f),path.join(dest,f)))}\"",
});
