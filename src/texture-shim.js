// `three` imports used by TGALoader. Only their parse() method is used
// (see texture-loaders-entry.js), so the base class is a stub and the filters are
// plain constants; nothing here duplicates the three.js copy inside bundle.js.
export { LinearMipmapLinearFilter } from '../node_modules/three/src/constants.js';
export class DataTextureLoader {
  constructor(manager) { this.manager = manager; }
}
