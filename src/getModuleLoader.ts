import { AsmRuntimeType, constructModule, StringMap } from './constructModule';
import { log } from './util/logger';

/**
 * Asynchronously load and initialize asm module.
 *
 * @returns {T} Factory function manages lifecycle of hunspell and virtual files.
 */
type moduleLoaderType<T> = () => Promise<T>;

/**
 * Type of runtime module function. This is node.js asm module loaded via plain `require`,
 * internally emscripten should compile with MODULARIZE=1 option to loaded module via require returns
 * function to construct wasm module internally.
 *
 * For example,
 * ```
 * const asmLoader: runtimeModuleType = require('./lib/wasm/hunspell')
 * asmLoader(); //actually construct wasm module
 * ```
 */
type runtimeModuleType = (moduleObject: StringMap) => AsmRuntimeType;

type getModuleLoaderType = <T, R extends AsmRuntimeType>(
  factoryLoader: (runtime: R) => T,
  runtimeModule: runtimeModuleType,
  module?: StringMap
) => moduleLoaderType<T>;

/**
 * Creates loader function to load and initialize wasm module.
 *
 * @param {(runtime: R) => T} factoryLoader Factory to create actual instance of implementation using loaded & initialized wasm runtime.
 *
 * @param {runtimeModuleType} runtimeModule Actual runtime to initialize.
 * It is wasm runtime loaded via plain `require` but compiled with MODULARIZED=1 preamble with SINGLE_FILE option
 * which should be function to accept asm module object to override.
 *
 * @param {{[key: string]: any}} [module] Stringmap object to be injected into wasm runtime for override / set additional value in asm module.
 *
 * @returns {moduleLoaderType<T>} Loader function
 */
const getModuleLoader: getModuleLoaderType = <T, R extends AsmRuntimeType>(
  factoryLoader: (runtime: R) => T,
  runtimeModule: runtimeModuleType,
  module?: StringMap
) => async () => {
  const constructedModule = constructModule(module || {});
  log(`loadModule: constructed module object for runtime`);

  try {
    const asmModule = runtimeModule(constructedModule);
    await asmModule.initializeRuntime();

    log(`loadModule: initialized wasm binary Runtime`);

    return factoryLoader(asmModule as R) as T;
  } catch (e) {
    log(`loadModule: failed to initialize wasm binary runtime`);
    throw e;
  }
};

export { runtimeModuleType, moduleLoaderType, getModuleLoaderType, getModuleLoader };
