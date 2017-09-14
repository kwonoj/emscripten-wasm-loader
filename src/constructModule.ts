import { ENVIRONMENT } from './environment';

/**
 * @internal
 * Build stringmap object to be injected when creates runtime for asm module.
 * Modularized asm module generated via MODULARIZE=1 accepts object as its creation function allow to attach
 * properties. Using those, this function construct few essential convinient functions like awaitable runtime init.
 *
 * Note some init like exporting in-memory FS functions can't be achieved via module object but should rely on
 * preprocessor (https://github.com/kwonoj/docker-hunspell-wasm/blob/eba7781311b31028eefb8eb3e2457d11f294e076/preprocessor.js#L14-L27)
 * to access function-scope variables inside.
 * @param {{[key: string]: any}} value pre-constructed value to be used, or empty object {}.
 * @param {ENVIRONMENT} environment Running environment to determine to use node.js specific path resolve.
 * @param {string} [asmDir] ABSOLUTE DIR PATH to wasm / asm binary (.wasm, .mem). If not specified, it'll try best guess via __dirname
 * @param {string} [binaryEndpoint] Provides endpoint to server to download binary module
 * (.wasm, .mem) via fetch when initialize module in a browser environment.
 *
 * @returns {{[key: string]: any}} Augmented object with prefilled interfaces.
 */
export const constructModule = (
  value: { [key: string]: any },
  environment: ENVIRONMENT,
  asmDir: string | null,
  binaryEndpoint?: string
) => {
  const ret = {
    ...value,
    __asm_module_isInitialized__: false,
    locateFile: (_fileName: string) => {
      /*noop*/
    },
    onRuntimeInitialized: () => {
      /*noop*/
    },
    initializeRuntime: () => Promise.resolve(true)
  };

  //If binaryEndpoint provided, consider it as override behavior and set locateFile fn
  //otherwise set default to locateFile on node.js.
  //Browser environment doesn't set custom locateFile if binaryEndpoint is not set.
  if (!!binaryEndpoint) {
    ret.locateFile = (fileName: string) =>
      environment === ENVIRONMENT.NODE
        ? //tslint:disable-next-line:no-require-imports
          require('path').join(binaryEndpoint, fileName)
        : `${binaryEndpoint}/${fileName}`;
  } else if (environment === ENVIRONMENT.NODE) {
    //tslint:disable-next-line:no-require-imports
    ret.locateFile = (fileName: string) => require('path').join(asmDir || __dirname, fileName);
  }

  //export initializeRuntime interface for awaitable runtime initialization
  ret.initializeRuntime = () => {
    if (ret.__asm_module_isInitialized__) {
      return Promise.resolve(true);
    }

    return new Promise(function(resolve, _reject) {
      let timeoutId = setTimeout(function() {
        resolve(false);
      }, 3000);

      ret.onRuntimeInitialized = () => {
        clearTimeout(timeoutId);
        ret.__asm_module_isInitialized__ = true;
        resolve(true);
      };
    });
  };

  return ret;
};
