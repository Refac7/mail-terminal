import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless'; // 或 '@astrojs/vercel/static' 如果是静态输出
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',          // 保持 server 模式，让 Vercel 动态渲染
  adapter: vercel(),         // 使用 Vercel 适配器
  integrations: [
    react({ includeAsyncSecrets: true, experimentalReactChildren: true }),
    tailwind()
  ],
  security: {
    checkOrigin: false
  }
});