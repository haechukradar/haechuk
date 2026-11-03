import { defineConfig } from 'astro/config';
import { SITE } from './config/site.mjs';

export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'ignore',
});
