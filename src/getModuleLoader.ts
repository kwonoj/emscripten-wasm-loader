import { constructModule } from './constructModule';
import { ENVIRONMENT } from './environment';
import { isNode } from './util/isNode';

const log = (..._args: Array<any>) => {
  //noop
};

/*
const asmType = isWasmEnabled() ? WASMTYPE.WASM : WASMTYPE.ASMJS;
log(`loadModule: load hunspell module loader from `, asmType);*/

/**
 * Creates loader to load and initialize wasm module.
 */
export const getModuleLoader: <T, R = any>(
  factoryLoader: (asmModule: R) => T,
  modulePath: string
) => (binaryEndpoint?: string, environment?: ENVIRONMENT) => Promise<T> =
  /**
   * Asynchronously load and initialize asm module.
   *
   * @param {string} [binaryEndpoint] Provides endpoint to server to download binary module
   * (.wasm, .mem) via fetch when initialize module in a browser environment.
   * @param {ENVIRONMENT} [environment] Override running environment to load binary module.
   * This option is mostly for Electron's renderer process, which is detected as node.js env by default
   * but in case of would like to use fetch to download binary module.
   *
   * @returns {HunspellFactory} Factory function manages lifecycle of hunspell and virtual files.
   */
  <T, R = any>(factoryLoader: (asmModule: R) => T, modulePath: string) => async (
    binaryEndpoint?: string,
    environment?: ENVIRONMENT,
    module?: { [key: string]: any }
  ) => {
    //tslint:disable-next-line:no-require-imports
    const moduleLoader = require(modulePath);
    log(`loadModule: moduleLoader imported`);

    const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.BROWSER;
    log(`loadModule: ${environment ? `using environment override ${environment}` : `running environment is ${env}`}`);

    if (!binaryEndpoint && env === ENVIRONMENT.BROWSER) {
      throw new Error('Cannot download binary module without endpoint on browser');
    }

    const constructedModule = constructModule(module || {}, env, binaryEndpoint);
    const asmModule = moduleLoader(constructedModule);

    await asmModule.initializeRuntime();
    log(`loadModule: initialized wasm binary Runtime`);

    return factoryLoader(asmModule);
  };
