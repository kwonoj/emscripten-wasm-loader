import { expect } from 'chai';
import { constructModule } from '../src/constructModule';
import { ENVIRONMENT } from '../src/environment';

describe('constructModule', () => {
  it('should inherit injected object', () => {
    const injected = { a: 1 };
    const module = constructModule(injected, ENVIRONMENT.WEB, null);

    expect(module).contains(injected);
    expect(module).to.have.property('ENVIRONMENT');
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
    const module = constructModule({}, ENVIRONMENT.WEB, null);

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
    const module = constructModule({}, ENVIRONMENT.WEB, null, 'end');
    const file = module.locateFile('file');

    expect(file).to.equal('end/file');
  });

  describe('initializeRuntime', () => {
    it('should be awaitable to initialize runtime', async () => {
      const module = constructModule({}, ENVIRONMENT.WEB, null);

      //onRuntimeInitialized is callback called inside of preamble init, we just call it to check logic
      setTimeout(() => (module as any).onRuntimeInitialized(), 10);
      expect(await module.initializeRuntime()).to.be.true;

      //subsequent attempt should resolve immediately without waiting onRuntimeInitialized
      expect(await module.initializeRuntime()).to.be.true;
    });

    it('should fail if init take too long', async () => {
      jest.useFakeTimers();

      const module = constructModule({}, ENVIRONMENT.WEB, null);
      const initPromise = module.initializeRuntime();

      jest.runAllTimers();
      expect(await initPromise).to.be.false;
    });

    it('should accept custom timeout', async () => {
      jest.useFakeTimers();

      const module = constructModule({}, ENVIRONMENT.WEB, null);
      const initPromise = module.initializeRuntime(100);

      jest.runTimersToTime(110);
      expect(await initPromise).to.be.false;
    });

    it('should reject when aborted', async () => {
      jest.useFakeTimers();
      const module = constructModule({}, ENVIRONMENT.WEB, null);

      let thrown = false;
      try {
        const init = module.initializeRuntime();

        //onAbort is callback called inside of preamble init, we just call it to check logic
        setTimeout(() => (module as any).onAbort('meh'), 100);
        jest.runTimersToTime(110);
        await init;
      } catch (e) {
        expect(e).to.be.a('Error');
        thrown = true;
      }
      expect(thrown).to.be.true;
    });

    it('should reject when aborted with error', async () => {
      jest.useFakeTimers();
      const module = constructModule({}, ENVIRONMENT.WEB, null);

      let thrown = false;
      try {
        const init = module.initializeRuntime();

        //onAbort is callback called inside of preamble init, we just call it to check logic
        setTimeout(() => (module as any).onAbort(new Error('meh')), 100);
        jest.runTimersToTime(110);
        await init;
      } catch (e) {
        expect(e).to.be.a('Error');
        thrown = true;
      }
      expect(thrown).to.be.true;
    });
  });
});
