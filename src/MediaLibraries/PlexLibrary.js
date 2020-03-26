import MediaLibraryBase from './MediaLibraryBase';
import EpisodeItem from '../MediaItems/EpisodeItem';
import MovieItem from '../MediaItems/MovieItem';
import PlexAPI from 'plex-api';
import PlexPinAuth from 'plex-api-pinauth';
import UserPrompt from '../Utils/UserPrompt';

const plexPinAuth = PlexPinAuth();

export class PlexLibrary extends MediaLibraryBase {

  _connect_pin() {
    // @TODO: get connection details from config / cli...
    this.client = new PlexAPI({
      hostname: '192.168.1.100',
      authenticator: plexPinAuth,
    });

    return plexPinAuth.getNewPin().then(pinObj => {
      return UserPrompt(`Visit https://plex.tv/pin and enter code: "${pinObj.code}". Hit enter when you have done so.`).then(() => pinObj);
    }).then(pinObj => {
      return new Promise((resolve, reject) => {
        plexPinAuth.checkPinForAuth(pinObj, (err, st) => {
          if (err) return reject(err);
          resolve(st);
        })
      });
    })
  }

  _connect() {
    // @TODO: get connection details from config / cli...
    this.client = new PlexAPI({
      hostname: '192.168.1.100',
      username: 'brian.reese@gmail.com',
      password: 'Rumple125!',
    });

    return Promise.resolve(true);
  }

  _getMedia() {
    const Media = [];
    return this._querySections().then(sections => {
      return Promise.all(sections.map(section => this._querySection(section.key)));l
    }).then(sectionsWithMetadata => {
      let promised = [];

      sectionsWithMetadata.forEach(section => {

        section.MediaContainer.Metadata.forEach(item => {
          switch (item.type) {
            case 'movie':
              Media.push(this._createMediaItemFromMovie(item));
              break;
            case 'show':
              let items = this._createMediaitemsFromShow(item);
              promised.push(items.then(episodes => {
                Media.push(...episodes);
              }));
          }
        });
      });

      return Promise.all(promised);
    }).then(() => {
      return Media;
    });
  }

  _querySections() {
    return this.client.query("/library/sections/all").then(
      result => result.MediaContainer.Directory.filter(
        it => ['movie', 'show'].includes(it.type)
      )
    );
  }

  _queryUri(uri) {
    return this.client.query(uri);
  }

  _querySection(id) {
    return this.client.query(`/library/sections/${id}/all`);
  }

  _queryMediaItem(ratingKey) {
    return this.client.query(`/library/metadata/${ratingKey}/children`);
  }

  _createMediaItemFromMovie(item) {
    item.id = item.ratingKey;
    return new MovieItem(item);
  }

  _createMediaitemsFromShow(item) {
    const episodes = [];
    return this._queryMediaItem(item.ratingKey).then(res => {
      // Show info.
      return Promise.all(res.MediaContainer.Metadata.map(it => this._queryUri(it.key)));
    }).then(res => {
      // array of seasons, with an array of episodes as metadata...
      res.forEach(season => {
        season.MediaContainer.Metadata.forEach(episode => {
          let data = {
            title: episode.title,
            showtitle: episode.grandparentTitle,
            // file: '',
            id: episode.ratingKey,
            episode: episode.index,
            season: episode.parentIndex,
            year: episode.year,
            playcount: episode.viewCount
          };

          episodes.push(new EpisodeItem(data));
        });
      });

      return episodes;
    });

  }

  _setWatched(item) {
    this.getMatchingMediaItem(item).forEach(matched => {
      if (matched.playcount >= 1) {
        return Promise.resolve();
      }

      return this._queryUri(`/:/scrobble?identifier=com.plexapp.plugins.library&key=${matched.id}`);
    });
  }

  _setUnatched(item) {
    this.getMatchingMediaItem(item).forEach(matched => {
      if (!matched.playcount) {
        return Promise.resolve();
      }

      return this._queryUri(`/:/unscrobble?identifier=com.plexapp.plugins.library&key=${matched.id}`);
    });
  }


}