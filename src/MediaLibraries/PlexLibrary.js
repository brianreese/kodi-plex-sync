import MediaLibraryBase from './MediaLibraryBase';
import EpisodeItem from '../MediaItems/EpisodeItem';
import MovieItem from '../MediaItems/MovieItem';
import PlexAPI from 'plex-api';
import prompt from 'prompt';

export class PlexLibrary extends MediaLibraryBase {

  _getTypeId() {
    return 'plex';
  }

  _getConfigurationSchema() {
    return {
      properties: {
        hostname: {
          description: "The hostname of the Plex server you wish to use, or an IP address.",
          default: "localhost",
          required: true,
          type: 'string',
        },
        username: {
          description: "The primary username for the Plex server.",
          required: true,
          type: 'string',
        },
        password: {
          description: "The primary account password.",
          hidden: true,
          replace: '*',
          required: true,
          type: 'string',
        },
        include_managed_user_creds: {
          description: "Do you want to migrate to a manged user instead of the primary plex user?",
          type: 'boolean',
        },
        managed_username: {
          description: "The managed user username.",
          default: "",
          required: true,
          type: 'string',
          ask: () => prompt.history('include_managed_user_creds').value,
        },
        managed_pin: {
          description: "The managed user pin. Leave blank if the manged user does not require a pin.",
          required: false,
          default: "",
          hidden: false,
          replace: '*',
          // type: 'string',
          pattern: /^(\d{4})?$/,
          ask: () => prompt.history('include_managed_user_creds').value,
        },
      }
    }
  }

  _connect() {
    const ApiConfig = {
      hostname: this.user_config.hostname,
      username: 'brian.reese@gmail.com',
      password: 'Rumple125!',
    };
    if (this.user_config.include_managed_user_creds) {
      ApiConfig.managedUser = {
        name: this.user_config.managed_username,
        pin: this.user_config.managed_pin,
      }
    }

    this.client = new PlexAPI(ApiConfig);

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

  async _queryUri(uri) {
    const res = this.client.query(uri);
    // console.log(res);
    return res;
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

  async _setWatched(item) {
    const matches = this.getMatchingMediaItem(item);
    const promises = matches.map(async matched => {
      // if (matched.playcount <= 1) {

        const promise = this._queryUri(`/:/scrobble?identifier=com.plexapp.plugins.library&key=${matched.id}`);
        // debugger;
        return promise;
      // }
      // return;
    });
    await Promise.all(promises);
  }

  async _setUnatched(item) {
    this.getMatchingMediaItem(item).forEach(matched => {
      if (!matched.playcount) {
        return Promise.resolve();
      }

      return this._queryUri(`/:/unscrobble?identifier=com.plexapp.plugins.library&key=${matched.id}`);
    });
  }

}
