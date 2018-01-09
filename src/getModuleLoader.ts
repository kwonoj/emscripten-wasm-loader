import { AsmRuntimeType, BinaryMetadata, constructModule, StringMap } from './constructModule';
import { ENVIRONMENT } from './environment';
import { isNode } from './util/isNode';
import { log } from './util/logger';

/**
 * Asynchronously load and initialize asm module.
 *
 * @param {ENVIRONMENT} [environment] Override running environment to load binary module.
 * This option is mostly for Electron's renderer process, which is detected as node.js env by default
 * but in case of would like to use fetch to download binary module.
 *
 * @param {BinaryMetadata} [binaryMetadata] Allow to specify separate wasm binary to load.
 * If this isn't specified, wasm should be compiled with SINGLE_FILE option.
 *
 * @returns {T}
 */
type moduleLoaderType<T> = (environment?: ENVIRONMENT, binaryMetadata?: BinaryMetadata) => Promise<T>;

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
  factoryLoader: (runtime: R, environment: ENVIRONMENT) => T,
  runtimeModule: runtimeModuleType,
  module?: StringMap
) => moduleLoaderType<T>;

/**
 * Creates loader function to load and initialize wasm module.
 *
 * @param {(runtime: R) => T} factoryLoader Factory to create actual instance of implementation using loaded & initialized wasm runtime.
 *
 * @param {runtimeModuleType} runtimeModule Actual runtime to initialize.
 * It is wasm runtime loaded via plain `require` but compiled with MODULARIZED=1
 * which should be function to accept asm module object to override.
 *
 * @param {{[key: string]: any}} [module] Stringmap object to be injected into wasm runtime for override / set additional value in asm module.
 *
 * @returns {moduleLoaderType<T>} Loader function
 */
const getModuleLoader: getModuleLoaderType = <T, R extends AsmRuntimeType>(
  factoryLoader: (runtime: R, environment: ENVIRONMENT) => T,
  runtimeModule: runtimeModuleType,
  module?: StringMap
) => async (environment?: ENVIRONMENT, binaryMetadata?: BinaryMetadata) => {
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  log(`loadModule: ${environment ? `using environment override ${environment}` : `running environment is ${env}`}`);

  const constructedModule = constructModule(module || {}, env, binaryMetadata);
  log(`loadModule: constructed module object for runtime`);

  try {
    const asmModule = runtimeModule(constructedModule);
    await asmModule.initializeRuntime();

    log(`loadModule: initialized wasm binary Runtime`);

    return factoryLoader(asmModule as R, env) as T;
  } catch (e) {
    log(`loadModule: failed to initialize wasm binary runtime`);
    throw e;
  }
};

export { BinaryMetadata, runtimeModuleType, moduleLoaderType, getModuleLoaderType, getModuleLoader };
