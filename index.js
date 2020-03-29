import libSync from './src/sync';
import Registry from './src/MediaLibraries/Registry';
import prompt from 'prompt';
import logger from 'rc_cli_util';

(async function init() {
  try {
    prompt.message = " * ";
    prompt.delimiter = "";

    await logger.printBanner('Kodi <-> Plex Sync');
    await logger.printLogo();
    logger.makeSpace();

    logger.message("This tool supports both episodes and movies from the following sources: ");
    const libraries = Registry.getLibraries();
    Object.keys(libraries).forEach(lib => logger.message(libraries[lib], 'bullet'));

    await libSync();

    logger.message('done');
  } catch (err) {
    logger.makeSpace();
    logger.error(err);
    logger.error(err.stack);
    logger.message('Looks like something went wrong. Feel free to try again!', 'h1');
  }
})()
