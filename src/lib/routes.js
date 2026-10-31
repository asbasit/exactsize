// Every public page, in one list. sitemap.xml is built from it, and a test keeps
// it in step with public/manus-routes.json.
import sizes from '../data/sizes.json' with { type: 'json' };
import forms from '../data/formPresets.json' with { type: 'json' };

const STATIC = [
  '/', '/resize-image/', '/passport-photos/',
  '/about/', '/contact/', '/privacy/', '/terms/', '/faq/', '/help/',
];

export function allRoutes() {
  return [
    ...STATIC.slice(0, 1),
    ...sizes.sizes.map((s) => `/${s.slug}/`),
    ...STATIC.slice(1, 3),
    ...forms.pages.map((p) => `/${p.slug}/`),
    ...STATIC.slice(3),
  ];
}

// Newest "last verified" date across the data files, for the footer.
export function latestVerified(...dates) {
  return dates.filter(Boolean).sort().at(-1);
}
