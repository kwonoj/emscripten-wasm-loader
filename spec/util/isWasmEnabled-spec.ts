import { expect } from 'chai';
import { root } from 'getroot';
import { isWasmEnabled } from '../../src/util/isWasmEnabled';

jest.mock('getroot', () => ({ root: {} }));

describe('isWasmEnabled', () => {
  it('should return true if native wasm object found', () => {
    root.WebAssembly = {
      compile: {},
      instantiate: {}
    };

    expect(isWasmEnabled()).to.be.true;
  });

  it('should return false if native wasm object not found', () => {
    root.WebAssembly = null;

    expect(isWasmEnabled()).to.be.false;
  });
});
