import { build } from "esbuild";
import path from 'node:path'
import fs, { readFileSync } from 'node:fs'
import { umdWrapper } from "esbuild-plugin-umd-wrapper";

const umdWrapperOptions = {
  libraryName: "RfxMod",
  external: "inherit",
  amdLoaderName: "define"
}

const dataUrl = {
    name: 'data-url-to-functions',
    setup(build) {
        build.onLoad({ filter: /\.js$/ }, (args) => {
            const source = readFileSync(args.path, 'utf-8');
            const transformedSource = source.replace(/import\s+(?:{[^}]*}\s+from\s+)?['"]data:application\/javascript;base64,([^'"]+)['"];\s*/g, (_, b64) => {
                const code = Buffer.from(b64, 'base64').toString('utf-8');
                return code;
            })
            return {
                contents: transformedSource,
                loader: 'js'
            }
        });
    }
}

let makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

build({
  bundle: true,
  format: "esm",
  entryPoints: [`./src/index.ts`],
  outfile: `./dist/index.mjs`,
  plugins: [],
  external: ["fs", "ws", "path"],
})

build({
  bundle: true,
  format: "cjs",
  entryPoints: [`./src/index.ts`],
  outfile: `./dist/index.js`,
  external: ["fs", "ws", "path"],
  plugins: [dataUrl, umdWrapper(umdWrapperOptions)]
})

build({
  bundle: true,
  format: "esm",
  entryPoints: [`./src/api.ts`],
  outfile: `./dist/api.mjs`,
  plugins: [],
  external: ["fs", "ws", "path"],
})

build({
  bundle: true,
  format: "iife",
  entryPoints: [`./src/api.ts`],
  outfile: `./dist/api.js`,
  external: ["fs", "ws", "path"],
  globalName: "RefluxAPIModule",
  plugins: [dataUrl]
})