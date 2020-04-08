import _ from 'lodash';
import { KodiLibrary } from './Kodi';
import { PlexLibrary } from './PlexLibrary';

const plugin_definitions = {
  kodi: {
    Library: KodiLibrary,
    Name: "Kodi",
  },
  plex: {
    Library: PlexLibrary,
    Name: "Plex Media Server",
  },
}

export default class MediaLibraryPluginRegistry {
  static getLibrary(type, config) {
    if (_.get(plugin_definitions, `${type}.Library`)) {
      return new plugin_definitions[type].Library(config);
    }
    throw new Error(`Invalid media library type: ${type}`)
  }

  static getLibraries() {
    return Object.assign(
      {},
      ...Object
        .keys(plugin_definitions)
        .map(l => ({[l]: plugin_definitions[l].Name || l}))
    );
  }

}