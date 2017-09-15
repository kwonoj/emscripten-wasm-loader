import { expect } from 'chai';
import { constructModule } from '../src/constructModule';
import { ENVIRONMENT } from '../src/environment';

describe('constructModule', () => {
  it('should inherit injected object', () => {
    const injected = { a: 1 };
    const module = constructModule(injected, ENVIRONMENT.BROWSER, null);

    expect(module).contains(injected);
  });

  it('should set locateFile when endpoint not specified on node', () => {
    const mockJoin = jest.fn();
    jest.mock('path', () => ({ join: mockJoin }));
    mockJoin.mockImplementation((...args: Array<any>) => [...args].join('/'));

    const asmDirModule = constructModule({}, ENVIRONMENT.NODE, 'end');
    const asmFile = asmDirModule.locateFile('file');
    expect(asmFile).to.equal('end/file');

    const module = constructModule({}, ENVIRONMENT.NODE, null);
    const file = module.locateFile('file2');
    expect(file).to.have.string('file2');
  });

  it('should not set locateFile when endpoint not specified on browser', () => {
    const module = constructModule({}, ENVIRONMENT.BROWSER, null);

    expect(module.locateFile).to.not.exist;
  });

  it('should set locateFile when endpoint set on node', () => {
    const mockJoin = jest.fn();
    jest.mock('path', () => ({ join: mockJoin }));
    mockJoin.mockImplementationOnce((...args: Array<any>) => [...args].join('/'));

    const module = constructModule({}, ENVIRONMENT.NODE, null, 'end');
    const file = module.locateFile('file');

    expect(file).to.equal('end/file');
  });

  it('should set locateFile when endpoint set on browser', () => {
    const module = constructModule({}, ENVIRONMENT.BROWSER, null, 'end');
    const file = module.locateFile('file');

    expect(file).to.equal('end/file');
  });

  describe('initializeRuntime', () => {
    it('should be awaitable to initialize runtime', async () => {
      const module = constructModule({}, ENVIRONMENT.BROWSER, null);

      //onRuntimeInitialized is callback called inside of preamble init, we just call it to check logic
      setTimeout(() => (module as any).onRuntimeInitialized(), 10);
      expect(await module.initializeRuntime()).to.be.true;

      //subsequent attempt should resolve immediately without waiting onRuntimeInitialized
      expect(await module.initializeRuntime()).to.be.true;
    });

    it('should fail if init take too long', async () => {
      jest.useFakeTimers();

      const module = constructModule({}, ENVIRONMENT.BROWSER, null);
      const initPromise = module.initializeRuntime();

      jest.runAllTimers();
      expect(await initPromise).to.be.false;
    });
  });
});
