import * as esbuild from 'esbuild'
import { mkdirSync } from 'node:fs'

const OUT_DIR = '24hagent-starter/bin'
mkdirSync(OUT_DIR, { recursive: true })

await esbuild.build({
  entryPoints: ['src/cli/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: `${OUT_DIR}/24hagent.mjs`,
  banner: { js: "import { createRequire } from 'node:module';const require = createRequire(import.meta.url);" },
  external: [],
})

console.log(`Starter CLI built: ${OUT_DIR}/24hagent.mjs`)
