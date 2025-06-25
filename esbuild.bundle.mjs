// import { dtsPlugin } from "esbuild-plugin-d.ts";
/**
 * THIS BUILD SCRIPT IS COPID FROM EPOXY, I DO NOT CLAIM CREDIT FOR IT
 */

import { build } from "esbuild";
import path from 'node:path'
import fs, { readFileSync } from 'node:fs'
import { umdWrapper } from "esbuild-plugin-umd-wrapper";

const umdWrapperOptions = {
  libraryName: "RfxMod", // default is unset
  external: "inherit", // <= default
  amdLoaderName: "define" // <= default
}

//for the CJS build: we take the import url and translate it into it's corresponding functions and annd that back to the file.
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

    // build.onResolve({ filter: /protocol/ }, args => ({ external: false }))
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
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
  // plugins: [dtsPlugin({
  //   outDir: `./dist/`,
  //   tsconfig: "tsconfig.json"
  // })]
})