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

  it('should create loader function with node environment', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, runtimeModule);

    const loaded = await loader();

    expect(runtimeModule.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls[0][0]).to.deep.equal(mockRuntime);
    expect(factoryLoader.mock.calls[0][1]).to.equal(ENVIRONMENT.NODE);

    expect(loaded).to.equal('boo');
  });

  it('should create loader function with browser environment', async () => {
    mockIsNode.mockReturnValueOnce(false);

    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, runtimeModule);

    const loaded = await loader();

    expect(runtimeModule.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls[0][0]).to.deep.equal(mockRuntime);
    expect(factoryLoader.mock.calls[0][1]).to.equal(ENVIRONMENT.WEB);

    expect(loaded).to.equal('boo');
  });

  it('should allow override environment to browser via loader', async () => {
    mockIsNode.mockReturnValueOnce(true);
    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, runtimeModule);

    await loader(ENVIRONMENT.WEB);
    expect(factoryLoader.mock.calls[0][1]).to.equal(ENVIRONMENT.WEB);
  });

  it('should allow override environment to node via loader', async () => {
    mockIsNode.mockReturnValueOnce(false);
    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, runtimeModule);

    await loader(ENVIRONMENT.NODE);
    expect(factoryLoader.mock.calls[0][1]).to.equal(ENVIRONMENT.NODE);
  });

  it('should throw when init runtime fail', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const runtimeModule = jest.fn(() => ({ initializeRuntime: () => Promise.reject(new Error('meh')) }));

    const loader = getModuleLoader(null as any, runtimeModule);
    let thrown = false;
    try {
      await loader();
    } catch (e) {
      expect(e).to.be.a('Error');
      thrown = true;
    }
    expect(thrown).to.be.true;
  });
});
