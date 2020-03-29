import prompt from 'prompt';
import _ from 'lodash';
import ConfigStore from './Utils/ConfigStore';
import Registry from './MediaLibraries/Registry';
import logger, { ProgressBar } from 'rc_cli_util';
import fs from 'fs';
import appRoot from 'app-root-path';

const configStore = new ConfigStore();
const configDir = `${appRoot}/config`;
const libraryInstances = {
  source: false,
  dest: false,
}

async function init() {
  let configFiles = await fs.promises.readdir('./config/');
  configFiles = configFiles.filter(filename => filename.match(/^(?!example\.).*\.yml/))
  if (configFiles.length) {
    logger.message("Would you like to load configuration from one of the config files listed below?");
    logger.message("(0 - continue without loading config.)");
    logArrayAsOptions(configFiles);
    const { configFile } = await logger.prompt({
      properties: {
        configFile: {
          description: 'Load a file?',
          message: `Enter a number above, from 0 to ${configFiles.length}. Enter '0' to skip the config file.`,
          conform: (val) => !isNaN(val) && val >= 0 && val <= configFiles.length,
        }
      }
    });
    if (configFile) {
      await configStore.load(`${configDir}/${configFiles[configFile - 1]}`);
      logger.message('Great, config file loaded.')
    }
  }
}

async function configure() {

  // const libraries = Registry.getLibraries();
  const active_config = configStore.getConfig() || {};

  const source_config = _.get(active_config, 'servers.source', {});
  const dest_config = _.get(active_config, 'servers.dest', {});
  let source_lib_type = _.get(active_config, 'servers.source.type');
  let dest_lib_type = _.get(active_config, 'servers.dest.type');

  if (source_lib_type) {
    active_config.source_lib_type = source_lib_type;
  }

  if (dest_lib_type) {
    active_config.dest_lib_type = dest_lib_type;
  }

  if (_.get(active_config, 'servers.source.managed_username')) {
    active_config.servers.source.include_managed_user_creds = true;
  }

  if (_.get(active_config, 'servers.dest.managed_username')) {
    active_config.servers.dest.include_managed_user_creds = true;
  }

  // Register overrides.
  prompt.override = active_config;

  // Prompt for remaining configuration from cli.
  logger.message("If there's information we need to gather about your libraries we'll do that now.", 'h2');
  libraryInstances.source = await instantiateLibrary(source_config, "Where would you like to migrate information FROM?");
  libraryInstances.dest = await instantiateLibrary(dest_config, "Where would you like to migrate information TO?");

  logger.message('All set. Make sure the following looks correct before continuing:', 'h2');
  logger.status(`Migration source library: ${libraryInstances.source.name} (found ${libraryInstances.source.getMediaCount()} shows and movies)`);
  logger.status(`Migration destination library: ${libraryInstances.dest.name} (found ${libraryInstances.dest.getMediaCount()} shows and movies)`);
  const { response: confirmation } = await logger.promptYN('Ready to continue? (Y/N)');
  if (!confirmation) throw new Error('Sync cancelled by user.');

  logger.makeSpace();
}

async function sync() {
  const bidirectional = false;
  const syncUnwatched = false;

  const is_watched_only = syncUnwatched && !bidirectional;
  const media_source = is_watched_only ?
    libraryInstances.source.getAllMedia() :
    libraryInstances.source.getWatchedMedia()
  ;

  logger.message(`Syncing ${is_watched_only ? 'watched' : 'all'} media from source to destination.`, 'h3');

  const bar1 = new ProgressBar(media_source.length);
  bar1.start();

  await asyncForEach(media_source, async media_item => {
    await libraryInstances.dest._setWatched(media_item);
    bar1.increment();
    return media_item;
  });

  bar1.update(media_source.length);
  bar1.stop();
  logger.makeSpace(2);
  logger.success(`Synced watched status from ${libraryInstances.source.name} to ${libraryInstances.dest.name}.`);

  if (bidirectional) {
    // Repeat in the other direction.
    // Bidirectional sync should never sync unwatched status.
    logger.message(`Syncing ${is_watched_only ? 'watched' : 'all'} media from destination to source.`, 'h3');
    const bar2 = new ProgressBar(media_source.length);
    bar2.start();
    const media_dest = libraryInstances.dest.getWatchedMedia();
    await asyncForEach(media_dest, async media_item => {
      await libraryInstances.source._setWatched(media_item);
      bar2.increment();
      return media_item;
    });

    bar2.update(media_dest.length);
    bar2.stop();
    logger.makeSpace(2);
    logger.success(`Synced watched status from ${libraryInstances.dest.name} to ${libraryInstances.source.name}.`);
  }

  logger.success('All sync tasks complete.');
}

async function instantiateLibrary(config = {}, prompt = 'Which type of library?') {
  let lib;
  try {
    const libraries = Registry.getLibraries();
    const schema = {
      properties: {
        response: {
          description: `Which library?`,
          conform: (val) => !isNaN(val) && val > 0 && val <= Object.keys(libraries).length,
          required: true,
        },
      }
    }

    let type = config.type;
    if (type && Object.keys(libraries).includes(type)) {
      logger.status(`Checking information for library ${type}`);
    } else {
      logger.message(prompt);
      logArrayAsOptions(Object.values(libraries));
      const { response } = await logger.prompt(schema);
      type = Object.keys(libraries)[response -1];
      config.type = type;
    }

    lib = Registry.getLibrary(type, config);
    await lib.waitForReady();
    return lib;
  } catch (err) {
    logger.warning('That didn\'t work, do you want to try again?');
    lib = null;
    const { response } = await logger.promptYN('Try again? (Y/N)');
    if (response) return instantiateLibrary({}, prompt);
    throw new Error('Unable to connect to library.');
  }
}

function logArrayAsOptions(arr) {
  arr.forEach((item, i) => logger.message(`${i + 1} - ${item}`));
}

export default async function run() {
    await init();
    await configure();
    await sync();
}

// Having trouble with async forEach.
// Creating a helper based on the blog post here: https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}