import { expect } from 'chai';
import { constructModule } from '../src/constructModule';

describe('constructModule', () => {
  it('should inherit injected object', () => {
    const injected = { a: '1' };
    const module = constructModule(injected);

    expect(module).contains(injected);
  });

  describe('initializeRuntime', () => {
    it('should be awaitable to initialize runtime', async () => {
      const module = constructModule({});

      //onRuntimeInitialized is callback called inside of preamble init, we just call it to check logic
      setTimeout(() => (module as any).onRuntimeInitialized(), 10);
      expect(await module.initializeRuntime()).to.be.true;

      //subsequent attempt should resolve immediately without waiting onRuntimeInitialized
      expect(await module.initializeRuntime()).to.be.true;
    });

    it('should fail if init take too long', async () => {
      jest.useFakeTimers();

      const module = constructModule({});
      const initPromise = module.initializeRuntime();

      jest.runAllTimers();
      expect(await initPromise).to.be.false;
    });

    it('should accept custom timeout', async () => {
      jest.useFakeTimers();

      const module = constructModule({});
      const initPromise = module.initializeRuntime(100);

      jest.runTimersToTime(110);
      expect(await initPromise).to.be.false;
    });

    it('should reject when aborted', async () => {
      jest.useFakeTimers();
      const module = constructModule({});

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

    it('should trap out early when aborted while initialize runtime', async () => {
      jest.useFakeTimers();
      const module = constructModule({});

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

    it('should not trap when aborted after init', async () => {
      jest.useFakeTimers();
      const module = constructModule({});

      let thrown = false;
      try {
        const init = module.initializeRuntime();
        (module as any).onRuntimeInitialized();

        //onAbort is callback called inside of preamble init, we just call it to check logic
        setTimeout(() => (module as any).onAbort(new Error('meh')), 100);
        jest.runTimersToTime(110);
        await init;
      } catch (e) {
        thrown = true;
      }
      //postamble.js will throw, so onAbort doesn't throw explicitly
      expect(thrown).to.be.false;
    });

    it('should not set locateFile when endpoint not specified on browser', () => {
      const module = constructModule({}) as any;
      expect(module.locateFile).to.not.exist;
    });

    it('should set locateFile when endpoint specified', () => {
      const module = constructModule({}, 'end') as any;
      const file = module.locateFile('file');
      expect(file).to.equal('end/file');
    });
  });
});
