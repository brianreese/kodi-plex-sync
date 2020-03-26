/**
 * @file
 * Sync library watched statuses between kodi and plex libraries.
 */

import Kodi from './MediaLibraries/Kodi';
import { PlexLibrary } from './MediaLibraries/PlexLibrary';

/**
 * Sync watched content from source to dest.
 *
 * @TODO: Setup console prompts to configre program:
 *  - source library + connection details
 *  - dest library + connection details
 *  - mode (uniderctional / bidirectional?)
 *  - other options? (sync watched only? reporting / logigng options?)
 */
const sourceLibrary = new Kodi();
const destinationLibrary = new PlexLibrary();
const bidirectional = false;
const syncUnwatched = false;

/**
 * Wait for all libraries to be ready before continuing.
 */
Promise.all([
  sourceLibrary.waitForReady(),
  destinationLibrary.waitForReady()
]).then(() => {
  const media_source = (syncUnwatched && !bidirectional) ?
    sourceLibrary.getAllMedia() :
    sourceLibrary.getWatchedMedia()
  ;

  media_source.forEach(media_item => {
    destinationLibrary.setWatched(media_item);
  });

  if (bidirectional) {
    // Repeat in the other direction.
    // Bidirectional sync should never sync unwatched status.
    const media_source = destinationLibrary.getWatchedMedia();
    media_source.forEach(media_item => {
      sourceLibrary._setWatched(media_item);
    });
  }

  // Done.
}).catch(err => {
  // @TODO: Handle error.
});
