import MediaLibraryBase from './MediaLibraryBase';
import EpisodeItem, { MEDIA_TYPE_EPISODE } from '../MediaItems/EpisodeItem';
import MovieItem, { MEDIA_TYPE_MOVIE } from '../MediaItems/MovieItem';
import Api from 'kodi';

const commonFields = [
  'title',
  'file',
  'playcount',
  'lastplayed',
  // 'uniqueid'
];

export const KodiMovieFields = [...commonFields].concat([
  // 'movieid',
  'year',
]);

export const KodiEpisodeFields = [...commonFields].concat([
  // 'episodeid',
  'episode',
  'season',
  'showtitle',
  ]);

export class KodiLibrary extends MediaLibraryBase {

  _getTypeId() {
    return 'kodi';
  }

  _getConfigurationSchema() {
    return {
      properties: {
        hostname: {
          description: "The hostname of the kodi client you wish to use, or an IP address.",
          default: "localhost",
          required: true,
        },
        port: {
          description: "The port of the kodi api.",
          default: "9090",
          required: true,
        },
      }
    };
  }

  /**
   *
   * @return {Promise}
   * @private
   */
  _connect() {
    // Wrap the connetion in a promise.
    const PromisedApi = new Promise((resolve, reject) => {
      Api.connect({
        // @TODO: Get these details from config file or cli prompt?
        host: this.user_config.hostname,
        port: this.user_config.port,
        reconnect: false,
        reconnectSleep: 3000,
        connectionTimeout: 10000,
        sendTimeout: 10000
      });

      Api.on('connect', () => {
        resolve(true);
      });

      Api.on('error', err => {
        reject(err);
      });
    });

    return PromisedApi;
  }

  _disconnect() {
    Api.close();
  }

  _getMedia() {
    return new Promise((resolve, reject) => {
      const Media = [];

      Api.send("VideoLibrary.GetEpisodes", { "properties": KodiEpisodeFields })
      .then(res => {
        Media.push(... res.episodes.map(episode => episode ? new EpisodeItem(episode) : null ));
        return res;
      }).then(() => {
        return Api.send("VideoLibrary.GetMovies", {"properties": KodiMovieFields});
      }).then(res => {
        Media.concat(... res.movies.map(movie => movie ? new MovieItem(movie) : null ));
      }).catch(err => {
        reject(err);
      }).finally(() => {
        resolve(Media);
      });

    });
  }

  async _sendWatched(item) {
    if (!item.playcount) {
      await this._sendPlaycount(item, 1);
    }
  }

  async _sendUnwatched(item) {
    if (item.playcount) {
      await this._sendPlaycount(item, 0);
    }
  }

  async _sendPlaycount(item, playcount) {
    let endpoint;
    let params = { playcount };
    switch (item.type) {
      case MEDIA_TYPE_MOVIE:
        endpoint = 'VideoLibrary.SetMovieDetails';
        params.movieid = item.movieid;
        break;
      case MEDIA_TYPE_EPISODE:
        endpoint = 'VideoLibrary.SetEpisodeDetails';
        params.episodeid = item.episodeid;
        break;
      default:
        throw new Error(`Invalid media type ${item.type}.`);
        break;
    }
    try {
      await Api.send(endpoint, params);
    } catch (err) {
      console.log(err);
    }
  }

}
