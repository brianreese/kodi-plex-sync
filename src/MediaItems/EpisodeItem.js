import MediaItemBase from './MediaItemBase';
import { KodiEpisodeFields } from '../MediaLibraries/kodi';

export const MEDIA_TYPE_EPISODE = 'MEDIA_EPISODE';

export default class EpisodeItem extends MediaItemBase {

  constructor(item) {
    super(item);
    this.type = MEDIA_TYPE_EPISODE;
  }

  _getOptionalProps() {
    return KodiEpisodeFields
      .filter(field => !this._getRequiredProps().includes(field))
      .concat(['id'])
    ;
  }

  _getDirectMatchProps() {
    return ['file'];
  }

  _getCompoundMatchProps() {
    return [['title', 'showtitle', 'episode', 'season']];
  }

}
