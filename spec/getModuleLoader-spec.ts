import { expect } from 'chai';
import { ENVIRONMENT } from '../src/environment';
//tslint:disable-next-line:no-require-imports
import getModuleLoaderType = require('../src/getModuleLoader');

describe('getModuleLoader', () => {
  let getModuleLoader: getModuleLoaderType.getModuleLoaderType;
  let mockIsNode: jest.Mock<any>;
  let mockConstructModule: jest.Mock<any>;

  beforeEach(() => {
    mockIsNode = jest.fn();
    mockConstructModule = jest.fn();
    jest.mock('../src/util/isNode', () => ({ isNode: mockIsNode }));
    jest.mock('../src/constructModule', () => ({ constructModule: mockConstructModule }));

    //tslint:disable-next-line:no-require-imports
    getModuleLoader = require('../src/getModuleLoader').getModuleLoader;
  });

  it('should create loader function', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, { dir: null, runtimeModule: runtimeModule as any });

    const loaded = await loader();

    expect(runtimeModule.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls[0][0]).to.deep.equal(mockRuntime);

    expect(loaded).to.equal('boo');
  });

  it('should create loader function for node', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const factoryLoader = jest.fn(() => 'boo');
    const runtimeModule = jest.fn(() => ({ initializeRuntime: () => Promise.resolve(true) }));

    const loader = getModuleLoader(factoryLoader as any, { dir: null, runtimeModule: runtimeModule as any });
    const loaded = await loader('bin');

    expect(loaded).to.equal('boo');
  });

  it('should create loader function for browser', async () => {
    mockIsNode.mockReturnValueOnce(false);

    const factoryLoader = jest.fn(() => 'boo');
    const runtimeModule = jest.fn(() => ({ initializeRuntime: () => Promise.resolve(true) }));

    const loader = getModuleLoader(factoryLoader as any, { dir: null, runtimeModule: runtimeModule as any });
    const loaded = await loader('bin');

    expect(loaded).to.equal('boo');
  });

  it('should throw if loader try to load on browser without endpoint', async () => {
    mockIsNode.mockReturnValueOnce(false);

    const loader = getModuleLoader(null as any, { dir: null, runtimeModule: null as any });

    let thrown = false;
    try {
      await loader();
    } catch (e) {
      expect(e).to.be.a('error');
      thrown = true;
    }

    expect(thrown).to.be.true;
  });

  it('should allow override environment via loader', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const loader = getModuleLoader(null as any, { dir: null, runtimeModule: null as any });

    let thrown = false;
    try {
      await loader(null as any, ENVIRONMENT.BROWSER);
    } catch (e) {
      expect(e).to.be.a('error');
      thrown = true;
    }

    expect(thrown).to.be.true;
  });

  it('should set asmDir on node', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const factoryLoader = jest.fn(() => 'boo');
    const runtimeModule = jest.fn(() => ({ initializeRuntime: () => Promise.resolve(true) }));

    const loader = getModuleLoader(factoryLoader as any, { dir: 'asmBoo', runtimeModule: runtimeModule as any });
    const loaded = await loader('bin');

    expect(mockConstructModule.mock.calls[0][2]).to.deep.equal('asmBoo');
    expect(loaded).to.equal('boo');
  });
});
