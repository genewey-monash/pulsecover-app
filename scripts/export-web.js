// Builds the installable web app and copies it into the website project at public/m (served at /m/).
// usage: node scripts/export-web.js "<path to website>/public"
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(process.argv[2] || '../PulseCoverSite/public', 'm');
const out = path.resolve(__dirname, '..', 'dist-web');
fs.rmSync(out, { recursive: true, force: true });
execSync('npx expo export -p web --output-dir dist-web', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />');
const head = [
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="PulseCover" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<link rel="manifest" href="/m/manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="/m/apple-touch-icon.png" />',
  '<style>html,body{background:#fff;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;overscroll-behavior-y:none}@media (prefers-color-scheme:dark){html,body{background:#121018}}</style>',
].join('\n  ');
html = html.replace('</head>', '  ' + head + '\n</head>');
fs.writeFileSync(path.join(out, 'index.html'), html);
// Vercel never deploys folders named node_modules, so the bundled fonts/images are moved to assets/vendor
const nm = path.join(out, 'assets', 'node_modules');
if (fs.existsSync(nm)) {
  fs.renameSync(nm, path.join(out, 'assets', 'vendor'));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return walk(f);
    if (/\.(js|html|json|css|map)$/.test(e.name)) {
      const txt = fs.readFileSync(f, 'utf8');
      if (txt.includes('assets/node_modules/')) fs.writeFileSync(f, txt.split('assets/node_modules/').join('assets/vendor/'));
    }
  });
  walk(out);
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(out, target, { recursive: true });
console.log('web app copied to', target);
