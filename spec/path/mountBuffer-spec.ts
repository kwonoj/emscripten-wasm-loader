import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { isMounted } from '../../src/path/isMounted';
import { mountBuffer } from '../../src/path/mountBuffer';

jest.mock('nanoid');
jest.mock('../../src/path/isMounted');

const memPathId: string = 'memPathPrefixDummy';
const getFsMock = () => ({
  writeFile: jest.fn()
});

describe('mountBuffer', () => {
  let fsMock: { writeFile: jest.Mock<any> };
  let mountBufferFn: (contents: ArrayBufferView, fileName?: string) => string;

  beforeEach(() => {
    fsMock = getFsMock();
    mountBufferFn = mountBuffer(fsMock as any, memPathId);
  });

  it('should return path if file is already mounted', () => {
    (isMounted as jest.Mock<any>).mockReturnValueOnce(true);
    const fileName = 'vFile.bin';

    const value = mountBufferFn(Buffer.from(''), fileName);

    expect(value).to.equal(`${memPathId}/${fileName}`);
  });

  it('should write file in memory filesystem', () => {
    (isMounted as jest.Mock<any>).mockReturnValueOnce(false);

    const fileName = 'vFile.bin';
    const contents = Buffer.from('dummy');
    const value = mountBufferFn(contents, fileName);
    const expectedMountPath = `${memPathId}/${fileName}`;

    expect(value).to.equal(expectedMountPath);
    expect(fsMock.writeFile.mock.calls).to.have.lengthOf(1);
    expect(fsMock.writeFile.mock.calls[0]).to.deep.equal([expectedMountPath, contents, { encoding: 'binary' }]);
  });

  it('should generate file name if not provided', () => {
    const nanoIdMock = nanoid as jest.Mock<any>;
    const dummyId = '_dummy_id';

    nanoIdMock.mockReturnValueOnce(dummyId);

    const value = mountBufferFn(Buffer.from(''));

    expect(value).to.equal(`${memPathId}/${dummyId}`);
    expect(nanoIdMock.mock.calls).to.have.lengthOf(1);
  });
});
