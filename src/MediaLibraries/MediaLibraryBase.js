/**
 * @file
 * Base class for media library client implementations.
 */
import events from 'events';
import prompt from 'prompt';
import logger from 'rc_cli_util';
import Registry from './Registry';

export default class MediaLibraryBase {

  constructor(config = false) {
    this.name = Registry.getLibraries()[this._getTypeId()];
    this.config = config;
    this.ready = false;
    this.error = false;
    this.emitter = new events.EventEmitter();
    this._configure().then( user_config => {
      this.user_config = user_config;
      logger.status(`Attempting to connect to ${this.name}.`);
      return this._connect();
    }).then(() => {
      logger.status(`Fetching media from ${this.name}.`);
      return this._getMedia();
    }).then(media => {
      this.media = media;
      this.ready = true;
      this.emitter.emit('ready');
    }).catch(err => {
      logger.error(err);
      this.ready = false;
      this.error = true;
      this.emitter.emit('error');
    }).finally(() => {
      this._disconnect();
    });
  }

  async _configure() {
    const schema = this._getConfigurationSchema();
    if (!schema) return;

    return new Promise((resolve, reject) => {
      prompt.override = this.config || {};
      prompt.start();
      prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    })
  }

  _getTypeId() {
    throw new Error(`Classes extending ${MediaLibraryBase.constructor} must implement getTypeId().`);
  }

  _getConfigurationSchema() {
    return false;
  }

  /**
   * Called to setup the connection to the media server.
   *
   * @return {Promise.<boolean>}
   *   A promise that resolves once any connection tasks are complete.
   *
   * @private
   */
  _connect() {
    return Promise.resolve(true);
  }

  /**
   * Called to terminate the connection to the media server.
   *
   * @return {Promise.<boolean>}
   *   A promise that resolves once any exit tasks are complete.
   *
   * @private
   */
  _disconnect() {
    return Promise.resolve(true);
  }

  /**
   * Called to populate media items from the library.
   *
   * Classes extending MediaLibraryBase must implement this method.
   *
   * @return {Promise.[<MovieItem>|<EpisodeItem>]}
   *   Resolves with (all) media from the library.
   *
   * @private
   */
  _getMedia() {
    throw new Error(`Classes extending ${MediaLibraryBase.constructor} must implement getMedia().`);
  }

  getMediaCount() {
    return this.getAllMedia().length;
  }

  /**
   * Get all media retrieved from the media library.
   *
   * @return [<MovieItem>|<EpisodeItem>]
   *   An array of media items.
   */
  getAllMedia() {
    return this.media;
  }

  /**
   * Get only watched media retrieved from the media library.
   *
   * @return [<MovieItem>|<EpisodeItem>]
   *   An array of media items.
   */
  getWatchedMedia() {
    return this.getAllMedia().filter(it => it.playcount);
  }

  /**
   * Get only unwatched media retrieved from the media library.
   *
   * @return [<MovieItem>|<EpisodeItem>]
   *   An array of media items.
   */
  getUnwatchedMedia() {
    return this.media.filter(it => !it.playcount);
  }

  /**
   * Get matching media items from the library.
   *
   * This method is used to compare a media item from library A with media items
   * in library B to find matches. Note that media items are considered matches
   * based on the specific logic implemented on the media item.
   *
   * @param item
   *   The media item to search for.
   *
   * @return {Array}
   *   An array of media items, or an empty array when no matches are found.
   *
   * @see MediaItemBase.matchMediaItem().
   */
  getMatchingMediaItem(item) {
    return this.media.filter(it => it.matchMediaItem(item));
  }

  /**
   * Sync watched status for matching media items.
   *
   * @param item
   *   The source media item.
   *
   * @return {Promise}
   *   A promise resolving once any update tasks have completed.
   */
  syncWathced(item) {
    return item.playcount ? this._setWatched(item) : this._setUnwatched(item);
  }

  /**
   * Set watched status to watched.
   *
   * @private
   */
  _setWatched(item) {
    throw new Error(`Classes extending ${MediaLibraryBase.constructor} must implement setWatched().`);
  }

  /**
   * Set watched status to unwatched.
   *
   * @private
   */
  _setUnwatched(item) {
    throw new Error(`Classes extending ${MediaLibraryBase.constructor} must implement setWatched().`);
  }

  /**
   * Get notified when setup tasks from the constructor are complete.
   *
   * @return {Promise}
   */
  waitForReady() {
    return new Promise((resolve, reject) => {
      if (this.ready) {
        resolve(true);
        return;
      }

      this.emitter.on('ready', () => {
        logger.success(`Connected to ${this.name}.`)
        resolve(true);
      });

      this.emitter.on('error', () => {
        reject(`Unable to connect to ${this.name}.`);
      })
    });
  }

  getName() {
    return this.name;
  }

}
