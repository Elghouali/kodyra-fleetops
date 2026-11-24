import { mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'styles.css', '_headers']) await cp(name, join('dist',name));
await cp('src', join('dist','src'), {recursive:true});
await cp('assets', join('dist','assets'), {recursive:true});
console.log('Static build ready: dist/');
