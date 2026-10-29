// Built into www/texture-loaders.js by `npm run build:loaders`. Must load after bundle.js.
//
// FBX files often embed textures as TGA or TIFF, which browsers can't decode.
// FBXLoader asks the LoadingManager for a ".tga" / ".tif" handler and, without one,
// substitutes an empty texture, so the model renders black. These handlers decode the
// file to pixels, draw them on a canvas, and return an ordinary Texture, so they get
// the same colour handling and size cap as PNG/JPEG textures.
import { TGALoader } from '../node_modules/three/examples/jsm/loaders/TGALoader.js';
// TIFF uses utif2 rather than three's TIFFLoader: the UTIF copy bundled with three r170
// only decodes the first strips of deflate-compressed TIFFs (the rest come out black).
import UTIF from 'utif2';

const tiffDecoder = {
  parse(buffer) {
    const ifds = UTIF.decode(buffer);
    UTIF.decodeImage(buffer, ifds[0]);
    return { width: ifds[0].width, height: ifds[0].height, data: UTIF.toRGBA8(ifds[0]) };
  },
};

const Texture = window.Rt;      // three.js Texture class inside bundle.js
const fbxLoader = window.iS;    // the FBXLoader instance bundle.js uses

function toCanvas({ data, width, height }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.buffer, data.byteOffset, width * height * 4), width, height), 0, 0);
  return canvas;
}

/** Minimal loader that FBXLoader can use as a manager handler. */
function makeHandler(decoder, label) {
  return {
    path: undefined,
    setPath(p) { this.path = p; return this; },
    load(url, onLoad, onProgress, onError) {
      const texture = new Texture();
      const full = (this.path || '') + url;
      fetch(full)
        .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.arrayBuffer(); })
        .then((buffer) => {
          texture.image = toCanvas(decoder.parse(buffer));
          texture.needsUpdate = true;
          if (onLoad) onLoad(texture);
        })
        .catch((err) => {
          console.warn(`Could not load ${label} texture ${url}:`, err);
          if (onError) onError(err);
        });
      return texture;
    },
  };
}

if (Texture && fbxLoader && fbxLoader.manager) {
  const manager = fbxLoader.manager;
  manager.addHandler(/\.tga$/i, makeHandler(new TGALoader(), 'TGA'));
  manager.addHandler(/\.tiff?$/i, makeHandler(tiffDecoder, 'TIFF'));
} else {
  console.warn('texture-loaders: bundle globals not found; TGA/TIFF textures stay unsupported');
}
