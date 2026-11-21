import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
export function offlineShell(): Plugin {
  return { name: 'offline-shell-manifest', generateBundle(_, bundle) {
    const files = ['/index.html', '/favicon.svg', '/demo-shop/index.html', '/demo-shop/shop.js', '/demo-shop/shop.css', ...Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => '/' + f)];
    const content = Object.values(bundle).map((v) => v.type === 'chunk' ? v.code : String(v.source)).join('');
    this.emitFile({ type: 'asset', fileName: 'offline-manifest.json', source: JSON.stringify({ version: 'repro-shell-' + createHash('sha256').update(content).digest('hex').slice(0, 16), files }) });
  } };
}
