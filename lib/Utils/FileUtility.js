const hostPattern = /(https?|smb):\/\/[^\s\/\\]+\//;
const pathPattern = /^.*[\\\/]/;
const extensionPattern = /\.[a-zA-Z0-9]+(?!.*\.)/;

export class FileUtility {

  static trimHostAndProtocol(file) {
    return typeof file === 'string' ?
      file.replace(hostPattern, '/') :
      file
    ;
  }

  static getFileName(file) {
    return typeof file === 'string' ?
      file.replace(pathPattern, '/').replace(extensionPattern, '') :
      file
    ;
  }

}
