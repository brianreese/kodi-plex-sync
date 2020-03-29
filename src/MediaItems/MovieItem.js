import MediaItemBase from './MediaItemBase';

export const MEDIA_TYPE_MOVIE = 'MEDIA_MOVIE';

export default class MovieItem extends MediaItemBase {

  constructor(item) {
    super(item);
    this.type = MEDIA_TYPE_MOVIE;
  }

  _getOptionalProps() {
    return super._getOptionalProps().concat(['year', 'id']);
  }

  _getCompoundMatchProps() {
    return [['title']];
  }
}
