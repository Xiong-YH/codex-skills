// Adapted from video-shotcraft, 2026-10-21: local-only MP4 and Jianying export service.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {createExportMiddleware} from './scripts/export-service.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const proj=['workbench.ts','workbench.tsx'].some(f=>existsSync(path.join(root,'proj',f)))?'proj':'proj-stub';
const exportsPlugin=():Plugin=>({name:'pixel-workbench-export',configureServer(server){server.middlewares.use('/api/export',createExportMiddleware({rootDir:root}));}});
export default defineConfig({
  plugins:[react(),exportsPlugin()],
  server:{host:'127.0.0.1',port:5208,strictPort:true,fs:{allow:[root]}},
  resolve:{preserveSymlinks:true,alias:{'@proj':path.join(root,proj)}},
  optimizeDeps:{include:['react','react-dom','remotion']},
});
