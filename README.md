[![Build Status](https://travis-ci.org/kwonoj/emscripten-wasm-loader.svg?branch=master)](https://travis-ci.org/kwonoj/emscripten-wasm-loader)
[![Build status](https://ci.appveyor.com/api/projects/status/la7qsyfmoekernj7/branch/master?svg=true)](https://ci.appveyor.com/project/kwonoj/emscripten-wasm-loader/branch/master)
[![codecov](https://codecov.io/gh/kwonoj/emscripten-wasm-loader/branch/master/graph/badge.svg)](https://codecov.io/gh/kwonoj/emscripten-wasm-loader)
[![npm](https://img.shields.io/npm/v/emscripten-wasm-loader.svg)](https://www.npmjs.com/package/emscripten-wasm-loader)
[![Greenkeeper badge](https://badges.greenkeeper.io/kwonoj/emscripten-wasm-loader.svg)](https://greenkeeper.io/)

# Emscripten-wasm-loader

Wraps up common initialization logic with predefined preprocessor object.

# Usage

```js
import { getModuleLoader } from 'emscripten-wasm-loader';

const loader = getModuleLoader(factoryLoader, {dir: 'path', runtimeModule: require('wasm/wasmlibaray') }, { additional: ''});
```

`getModuleLoader` is higher order function returns actual module loader.

```js
getModuleLoader<T, R extends AsmRuntimeType>(
  factoryLoader: (runtime: R) => T,
  asm: { dir: string | null; runtimeModule: runtimeModuleType },
  module?: stringMap
) => moduleLoaderType<T>;

/**
 * Asynchronously load and initialize asm module.
 *
 * @param {string} [binaryEndpoint] Provides endpoint to server to download binary module
 * (.wasm, .mem) via fetch when initialize module in a browser environment.
 * @param {ENVIRONMENT} [environment] Override running environment to load binary module.
 * This option is mostly for Electron's renderer process, which is detected as node.js env by default
 * but in case of would like to use fetch to download binary module.
 *
 * @returns {T} Factory function manages lifecycle of hunspell and virtual files.
 */
type moduleLoaderType<T> = (binaryEndpoint?: string, environment?: ENVIRONMENT) => Promise<T>;
```

`factoryLoader` is function to create actual instance of module using initialized wasm binary runtime. `asm` requires 2 values, `dir` is absolute path of `wasm` or `mem` binary location, and `runtimeModule` is function loaded via `require` to emscripten preamble js for wasm binaries. It expected wasm binary should be built with `MODULARIZE=1` option so `runtimeModule` can be function to be executed. In case of `dir`, it's node.js only option and will be ignored on browser environment. Lastly `module` is object to be inherited when execute `runtimeModule`. Emscripten's modularized preamble construct scoped wasm runtime module named `Module`, allows to have predefined object if needed. Internally `getModuleLoader` augments given object and set default interfaces like `initializeRuntime`.
