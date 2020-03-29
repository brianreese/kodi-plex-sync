import MediaLibraryBase from './MediaLibraryBase';
import EpisodeItem from '../MediaItems/EpisodeItem';
import MovieItem from '../MediaItems/MovieItem';
import Api from 'kodi';
import logger from 'rc_cli_util';

const commonFields = [
  'title',
  'file',
  'playcount',
  'lastplayed',
];

export const KodiMovieFields = [...commonFields].concat([
  'year'
]);

export const KodiEpisodeFields = [...commonFields].concat([
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

}
