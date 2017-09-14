import { expect } from 'chai';
import * as index from '../src/index';

describe('index', () => {
  it('should export correctly', () => {
    const { enableLogger, log, getModuleLoader } = index;

    expect(enableLogger).to.exist;
    expect(log).to.exist;
    expect(getModuleLoader).to.exist;
  });
});
