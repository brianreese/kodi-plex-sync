import MediaLibraryBase from './MediaLibraryBase';
import EpisodeItem from '../MediaItems/EpisodeItem';
import MovieItem from '../MediaItems/MovieItem';
import Api from 'kodi';

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

export default class Kodi extends MediaLibraryBase {

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
        host: "192.168.1.100",
        port: 9090,
        reconnect: false,
        reconnectSleep: 3000,
        connectionTimeout: 10000,
        sendTimeout: 10000
      });

      Api.on('connect', () => {
        console.log('api connected');
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
