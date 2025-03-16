// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	base: process.env.BASE_URL ?? '/',
  site: process.env.SITE_URL ?? 'https://wallet.page', // Set your production site URL here
  integrations: [
    react(),
    sitemap(), // Adds sitemap integration
  ],
  vite: {
    ssr: {
      noExternal: [
        '@mui/*',
      ],
      external: [
        '@mui/x-internals',
      ],
    },
  },
});
