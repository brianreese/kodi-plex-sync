import { FileUtility } from '../Utils/FileUtility';

export const MEDIA_TYPE_GENERIC = 'MEDIA_GENERIC';

export default class MediaItemBase {

  constructor(item) {
    this._getRequiredProps().forEach(prop => {
      if (!item[prop]) {
        throw new Error(`Media item must have property ${prop}.`)
      }

      this[prop] = item[prop];
    });

    this._getOptionalProps().forEach(prop => {
      this[prop] = item[prop] || null;
    });

    // Special handling for file names.
    // @TODO: Clean up or remove (Consider Nodejs Path here or in file util).
    if (this.hasOwnProperty('file') && this.file) {
      this.filePath = FileUtility.trimHostAndProtocol(this.file);
      this.fileName = FileUtility.getFileName(this.file);
    }

    this.type = MEDIA_TYPE_GENERIC;

  }

  _getRequiredProps() {
    return [];
  }

  _getOptionalProps() {
    return ['id', 'file', 'playcount', 'title', 'label'];
  }

  /**
   * We'll consider two media items the same if any of these props match.
   */
  _getDirectMatchProps() {
    return ['file'];
  }

  /**
   * We'll consider two media items the same if they match on sets of props defined here.
   */
  _getCompoundMatchProps() {
    return [];
  }

  matchFile(file) {
    const filePath = FileUtility.trimHostAndProtocol(file);
    const fileName = FileUtility.getFileName(file);

    return (
      this.file === file ||
      this.filePath === filePath ||
      this.fileName === fileName
    );
  }

  matchMediaItem(item) {
    if (!item instanceof MediaItemBase) return false;
    if (!(item.type === this.type )) return false;

    let match = false;

    // Direct comparison for direct match props.
    this._getDirectMatchProps().forEach(prop => {
      if (this._looseMatchProps(this[prop], item[prop])) return match = true;
    });

    // Compare all props for compound match props.
    if (!match) {
      this._getCompoundMatchProps().forEach(props => {
        let compound_match = true;
        props.forEach(prop => {
          compound_match = compound_match && this._looseMatchProps(this[prop], item[prop]);
        });
        if (compound_match) return match = true;
      });
    }

    return match;
  }

  _looseMatchProps(a, b) {
    if (typeof a !== typeof b) return false;
    switch (typeof a) {
      case 'string':
        return a.toLowerCase().trim() === b.toLowerCase().trim();
        break;
      default:
        return a === b;
    }
  }

  getType() {
    return this.type;
  }

}
