import { expect } from 'chai';
import { join, resolve } from 'path';
import * as unixify from 'unixify';
import { isMounted } from '../../src/path/isMounted';
import { mkdirTree } from '../../src/path/mkdirTree';
import { mountDirectory } from '../../src/path/mountDirectory';
import { isNode } from '../../src/util/isNode';

jest.mock('path');
jest.mock('../../src/path/isMounted');
jest.mock('../../src/path/mkdirTree');
jest.mock('../../src/util/isNode');

const nodePathId: string = 'nodePathPrefixDummy';
const getFsMock = () => ({
  filesystems: {
    NODEFS: 'nodefs'
  },
  mount: jest.fn()
});

describe('mountDirectory', () => {
  let fsMock: { mount: jest.Mock<any> };
  beforeEach(() => {
    fsMock = getFsMock();
    (isNode as jest.Mock<any>).mockReturnValue(true);
  });

  it('should throw if environment is not node', () => {
    (isNode as jest.Mock<any>).mockReturnValueOnce(false);

    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId);
    expect(() => mountDirectoryFn('/user')).to.throw();
  });

  it('should return if path is already mounted', () => {
    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId);

    (join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (resolve as jest.Mock<any>).mockImplementationOnce((arg: string) => arg);
    (isMounted as jest.Mock<any>).mockReturnValueOnce(true);

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectoryFn(dir)).to.equal(expected);
    expect((fsMock.mount as jest.Mock<any>).mock.calls).to.be.empty;
    expect((mkdirTree as jest.Mock<any>).mock.calls).to.be.empty;

    jest.resetAllMocks();
  });

  it('should create and mount for new path provided', () => {
    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId);

    (join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (resolve as jest.Mock<any>).mockImplementation((arg: string) => arg);
    (isMounted as jest.Mock<any>).mockReturnValueOnce(false);
    const mountMock = fsMock.mount as jest.Mock<any>;

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectoryFn(dir)).to.equal(expected);

    expect(mountMock.mock.calls).to.have.lengthOf(1);
    expect(mountMock.mock.calls[0]).to.deep.equal(['nodefs', { root: dir }, expected]);
    expect((mkdirTree as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    expect((mkdirTree as jest.Mock<any>).mock.calls[0]).to.deep.equal([fsMock, expected]);

    jest.resetAllMocks();
  });
});
