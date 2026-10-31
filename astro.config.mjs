import { defineConfig } from 'astro/config';

// The live address. Canonical tags, Open Graph URLs, sitemap.xml and robots.txt
// all read it. Change it here once the domain is bought (Session 4).
export const SITE_URL = 'https://exactsize.pages.dev';

export default defineConfig({
  site: SITE_URL,
  build: { format: 'directory' },
  trailingSlash: 'always',
});
