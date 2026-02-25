import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    // 关键：关闭 includeAsyncSecrets 以避免部分 SSR 问题
    // 关闭 StrictMode 以消除 react-quill 的 findDOMNode 警告
    react({ includeAsyncSecrets: true, experimentalReactChildren: true }), 
    tailwind()
  ],
  // 移除之前的 vite.ssr.external 配置，因为不再需要 better-sqlite3
});