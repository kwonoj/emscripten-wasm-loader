import { expect } from 'chai';
import { root } from 'getroot';
import { isNode } from '../../src/util/isNode';

jest.mock('getroot', () => ({ root: {} }));

describe('isNode', () => {
  it('should return true if node specific object found', () => {
    root.process = {
      versions: {
        node: 8
      }
    };

    expect(isNode()).to.be.true;
  });

  it('should return false if node process object not found', () => {
    root.process = null;

    expect(isNode()).to.be.false;
  });

  it('should return false if node versions object not found', () => {
    root.process = {
      versions: null
    };

    expect(isNode()).to.be.false;
  });

  it('should return false if node object not found', () => {
    root.process = {
      versions: {
        node: undefined
      }
    };

    expect(isNode()).to.be.false;
  });
});
