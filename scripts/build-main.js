import { build } from 'esbuild'

build({
  entryPoints: ['src/main/index.ts', 'src/preload/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outdir: 'dist',
  outbase: 'src',
  format: 'cjs',
}).catch(() => process.exit(1))
