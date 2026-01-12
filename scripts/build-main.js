import { build } from 'esbuild'

build({
  entryPoints: ['src/main/index.ts', 'src/preload/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outdir: 'dist',
  outbase: 'src',
  format: 'esm',
  banner: {
    js: `import { createRequire } from 'module';import { fileURLToPath } from 'url';import { dirname } from 'path';const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);`,
  },
}).catch(() => process.exit(1))
