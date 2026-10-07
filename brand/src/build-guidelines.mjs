// Builds the brand guidelines page from its template:
//   <!--SVG:name-->  inlines brand/logo/name.svg (sized by its container)
//   <!--ICONS-->     renders the Lucide icons used in the ERP
//   <!--IMG:key-->   embeds a product screenshot as a data URI
// Outputs a fragment for publishing (dist/guidelines.fragment.html) and a standalone page (brand/brand-guidelines.html).
//
// usage: node brand/src/build-guidelines.mjs <dashboard.png> <invoice.png>   (run from the project root,
//        with `lucide` resolvable, e.g. NODE_PATH=frontend/node_modules)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, '..');
const require = createRequire(join(brand, '..', 'frontend', 'package.json'));
const lucide = require('lucide');

const svg = (name) => {
  if (name === 'novafer-mark-white') {
    return svg('novafer-mark').replace(/fill="#2B4ACB"/g, 'fill="#FFFFFF"');
  }
  return readFileSync(join(brand, 'logo', `${name}.svg`), 'utf8')
    .replace(/<title>.*?<\/title>/, '')
    .replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%" style="display:block"')
    .replace(/role="img" aria-label="[^"]*"/, 'aria-hidden="true"')
    .trim();
};

const ICONS = [
  ['FileText', 'Devis'], ['Receipt', 'Facture'], ['Wallet', 'Règlement'], ['MessageSquareWarning', 'Réclamation'],
  ['Building2', 'Client'], ['Package', 'Produit'], ['Warehouse', 'Stock'], ['BarChart3', 'Analyses'],
  ['Printer', 'Imprimer'], ['Send', 'Émettre'], ['Search', 'Rechercher'], ['Settings', 'Paramètres'],
];
const icon = ([name]) => {
  const body = lucide[name].map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
};
const icons = ICONS.map((i) => `<figure>${icon(i)}<figcaption>${i[1]}</figcaption></figure>`).join('');

const [dashboardPng, invoicePng] = process.argv.slice(2);
const dataUri = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
/** PNG pixel size, read from the IHDR chunk. */
const size = (p) => { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const fragment = readFileSync(join(here, 'guidelines.template.html'), 'utf8')
  .replace(/<!--SVG:([a-z-]+)-->/g, (_, name) => svg(name))
  .replace('<!--ICONS-->', icons)
  .replace('<!--IMG:dashboard-->', dataUri(dashboardPng))
  .replace('<!--IMG:invoice-->', dataUri(invoicePng))
  .replace(/(alt="Novafer ERP dashboard[^"]*") width="\d+" height="\d+"/, (_, alt) => `${alt} width="${size(dashboardPng).w}" height="${size(dashboardPng).h}"`)
  .replace(/(alt="Printed Novafer invoice[^"]*") width="\d+" height="\d+"/, (_, alt) => `${alt} width="${size(invoicePng).w}" height="${size(invoicePng).h}"`);

mkdirSync(join(brand, 'dist'), { recursive: true });
writeFileSync(join(brand, 'dist', 'guidelines.fragment.html'), fragment);
// Standalone page: the fragment's title, font links and styles go in the head.
const split = fragment.indexOf('<div class="shell">');
writeFileSync(join(brand, 'brand-guidelines.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<link rel="icon" type="image/svg+xml" href="logo/novafer-app-icon.svg">\n${fragment.slice(0, split)}</head>\n<body>\n${fragment.slice(split)}\n</body>\n</html>\n`);
console.log('fragment', Math.round(fragment.length / 1024), 'KB');
