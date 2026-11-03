import { defineConfig } from 'astro/config';
import { SITE } from './config/site.mjs';

export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'ignore',
  // transfers.html 형태로 생성 → Cloudflare가 /transfers 를 /transfers/ 로 돌려보내지 않고 바로 응답
  build: { format: 'file' },
});
