import { ENVIRONMENT } from './environment';

export const constructModule = (value: { [key: string]: any }, environment: ENVIRONMENT, binaryEndpoint?: string) => {
  const ret = {
    ...value,
    __asm_module_isInitialized__: false,
    locateFile: (_fileName: string) => {
      /*noop*/
    },
    initializeRuntime: () => Promise.resolve(true),
    onRuntimeInitialized: () => {
      /*noop*/
    }
  };

  //if binaryEndpoint provided, consider it as override behavior and set locateFile fn
  //otherwise set default to locateFile on node.js
  if (!!binaryEndpoint) {
    ret.locateFile = (fileName: string) =>
      environment === ENVIRONMENT.NODE
        ? //tslint:disable-next-line:no-require-imports
          require('path').join(binaryEndpoint, fileName)
        : `${binaryEndpoint}/${fileName}`;
  } else if (environment === ENVIRONMENT.NODE) {
    //tslint:disable-next-line:no-require-imports
    ret.locateFile = (fileName: string) => require('path').join(__dirname, fileName);
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
