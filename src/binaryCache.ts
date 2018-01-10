import Dexie from 'dexie';
import { root } from 'getroot';
import { ENVIRONMENT } from './environment';
import { log } from './util/logger';

interface BinaryCacheMetadata {
  /**
   * Wasm name to lookup in cache.
   */
  name: string;
  /**
   * Version of binary to lookup in cache.
   */
  version: string;
}

/**
 * Browser specific metadata
 */
interface BinaryFileMetadata {
  /**
   * Wasm binary file name to load.
   * Emscripten preamble does have hardcode this file name when build, but does not expose
   * to generated module to access it but calls internally only with `locateFile` override.
   *
   * This property workaround those when calling instantiateWasm.
   */
  filename: string;
  /**
   *  path to wasm / asm binary (.wasm, .mem). If not specified, it'll try best guess via __dirname
   */
  locationPath?: string;
}

/**
 * Browser specific metadata
 */
interface BinaryEndpointMetadata {
  /**
   * Endpoint to server to download binary module on browser
   */
  endpoint: string;
}

type BinaryMetadata = Partial<BinaryCacheMetadata> & (BinaryFileMetadata | BinaryEndpointMetadata);

interface CachedBinary {
  name: string;
  version: string;
  binaryBlob: any;
}

const getBinaryCache: () => Dexie & { modules: Dexie.Table<CachedBinary, number> } = () => {
  //tslint:disable-next-line:no-require-imports
  const dexieModule = require('dexie');
  const dexieFactory = (dexieModule.default || dexieModule) as typeof Dexie;
  const db = new dexieFactory('emscripte-wasm-loader-cache');

  //set auto incremented id as primary key, and name / version property as queryable.
  db.version(1).stores({ modules: '++id, name, version' });
  return db as any;
};

/**
 * Read wasm binary from specified endpoint, construct resultObject by instantiate it.
 * This is stripped / simplifed flow of original wasm instntiation in preamble,
 * (https://github.com/kripken/emscripten/blob/78b44ed55cc4d0b4d79f62df9e80ae6f29a5345b/src/preamble.js#L2116)
 *
 * as once override `instantiateWasm` it doesn't execute existing preamble instntiation anymore.
 */
const compileBinary = async (metadata: BinaryMetadata & { environment: ENVIRONMENT },
                             importObject: any) => {
  const { environment } = metadata;
  const { locateFile, readBinary } = importObject.parent;

  //In case of nodejs with if specified locateFile override, use filesystem to read binary
  if (environment === ENVIRONMENT.NODE && locateFile) {
    const { filename } = metadata as BinaryFileMetadata;
    try {
      const filePath = locateFile(filename);
      return await root.WebAssembly.instantiate(readBinary(filePath), importObject);
    } catch (error) {
      log(`downloadBinary: could not load binary from ${filename}`, { error });
    }
  } else {
    //For browser, we do fetch from specified endpoint and do streaming instantiation
    const { endpoint } = metadata as BinaryEndpointMetadata;
    return await root.WebAssembly.instantiateStreaming(root.fetch(endpoint, { credentials: 'same-origin' }), importObject);
  }
  return null;
};

/**
 * Instantiate wasm binary, returns instantiated resultObject.
 * If binary blod is not cached in binaryCache, it'll fetch / read binary and cache it
 */
const instantiateBinary = (metadata: BinaryMetadata & { environment: ENVIRONMENT },
                           importObject: any) => {
  const dexie = getBinaryCache();
  const { name, version } = metadata;

  return dexie.transaction('rw', dexie.modules, async () => {
    const cachedBinaryCollection = await dexie.modules.where({ name: name!, version: version! });
    const cachedBinary = await cachedBinaryCollection.toArray();

    //found cached blob
    if (cachedBinary.length === 1) {
      log(`instantiateBinary: found cached blob for '${name}:${version}'`);
      return await root.WebAssembly.instantiate(cachedBinary[0].binaryBlob, importObject);
    }

    //something went off, clear existing entires
    if (cachedBinary.length > 1) {
      log(`instantiateBinary: '${name}:${version}' have unexpected cache blobs, clearing existing blobs and instantiate new one`);
      await cachedBinaryCollection.delete();
    }

    //cannot lookup cache for corresponding version, do first time compilation
    const resultObject = await compileBinary(metadata, importObject);
    if (!!resultObject) {
      //got compiled resultobject, now cache it
      await dexie.modules.add({ name: name!, version: version!, binaryBlob: resultObject.module });

      //delete old version of cache if exists. Allow up to 3 historical binaries.
      const updatedCachedBinaries = await dexie.modules.where({ name: name! }).sortBy('id');
      if (updatedCachedBinaries.length > 3) {
        const binaryVersionToDelete = updatedCachedBinaries.slice(0, updatedCachedBinaries.length - 3).map((x) => x.version);
        await dexie.modules.where({ name: name! }).filter((x) => (binaryVersionToDelete as any).includes(x.version)).delete();

        log(`instantiateBinary: deleted old binaries for ${name}`, { binaryVersionToDelete });
      }
    } else {
      log(`instantiateBinary: could not read resultobject from wasm binary`);
    }

    return resultObject;
  }).catch((reason) => {
    log(`instantiateBinary: binaryCache transaction wasn't successul, trying to fall back clean instantiate`, { reason });
    return compileBinary(metadata, importObject);
  });
};

export { BinaryCacheMetadata, BinaryEndpointMetadata, BinaryFileMetadata, BinaryMetadata, CachedBinary, instantiateBinary };
