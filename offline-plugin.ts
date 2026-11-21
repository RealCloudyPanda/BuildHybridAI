import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export function offlineShell(): Plugin {
  return { name: 'offline-shell-manifest', generateBundle(_, bundle) {
    const files = ['/index.html', '/favicon.svg', '/demo-shop/index.html', '/demo-shop/shop.js', '/demo-shop/shop.css', ...Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => '/' + f)];
    const publicContent = files.filter((f) => !f.startsWith('/assets/') && f !== '/index.html').map((f) => readFileSync(new URL('./public' + f, import.meta.url), 'utf8')).join('');
    const content = publicContent + Object.values(bundle).map((v) => v.type === 'chunk' ? v.code : String(v.source)).join('');
    const manifest = { version: 'repro-shell-' + createHash('sha256').update(content).digest('hex').slice(0, 16), files };
    this.emitFile({ type: 'asset', fileName: 'offline-manifest.json', source: JSON.stringify(manifest) });
    const worker = readFileSync(new URL('./offline-worker.js', import.meta.url), 'utf8').replace('__SHELL_MANIFEST__', JSON.stringify(manifest));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
  } };
}
