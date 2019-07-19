import { expect } from 'chai';
import { getModuleLoader } from '../src/getModuleLoader';

jest.mock('../src/util/isNode');
jest.mock('../src/constructModule');

//tslint:disable-next-line:no-require-imports no-var-requires
const mockIsNode = require('../src/util/isNode').isNode as jest.Mock<any>;

describe('getModuleLoader', () => {
  it('should create loader function', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const factoryLoader = jest.fn(() => 'boo');
    const mockRuntime = { initializeRuntime: () => Promise.resolve(true) };
    const runtimeModule = jest.fn(() => mockRuntime);

    const loader = getModuleLoader(factoryLoader as any, runtimeModule);

    const loaded = await loader();

    expect(runtimeModule.mock.calls).to.have.lengthOf(1);
    expect(factoryLoader.mock.calls).to.have.lengthOf(1);
    expect((factoryLoader.mock.calls[0] as any)[0]).to.deep.equal(mockRuntime);

    expect(loaded).to.equal('boo');
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

  it('should accept init options', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const mockRuntime = jest.fn(() => Promise.resolve(true));
    const runtimeModule = jest.fn(() => ({ initializeRuntime: mockRuntime }));

    const loader = getModuleLoader(jest.fn() as any, runtimeModule, null as any, { timeout: 1000 });
    loader();

    expect((mockRuntime.mock.calls as any)[0][0]).to.equal(1000);
  });

  it('should throw when init timeout', async () => {
    mockIsNode.mockReturnValueOnce(true);

    const mockRuntime = jest.fn(() => Promise.resolve(false));
    const runtimeModule = jest.fn(() => ({ initializeRuntime: mockRuntime }));

    const loader = getModuleLoader(jest.fn() as any, runtimeModule, null as any, { timeout: 1000 });

    let thrown = false;
    try {
      await loader();
    } catch (_e) {
      thrown = true;
    } finally {
      expect(thrown).to.be.true;
    }
  });
});
