import Registry from './MediaLibraries/Registry';
import logger, { ProgressBarCount } from 'rc_cli_util';
import PromisePool from '@supercharge/promise-pool';

const libraryInstances = {
  source: false,
}

async function configure() {

  logger.warning("This is dangerous ... proceed with caution.");
  const lib = await instantiateLibrary({}, "Which library would you like to reset?");
  const { response: op } = await logger.promptYN("Do you wish to set all media to 'watched' instead of the default 'unwatched'?");
  const { response: confirmation } = await logger.promptYN('Ok. Ready to do this? (Y/N)');
  if (!confirmation) throw new Error('Sync cancelled by user.');

  logger.makeSpace();

  const media_source = lib.getAllMedia();

  logger.message(`Resetting watch statuses for all media.`, 'h3');

  const bar1 = new ProgressBarCount(media_source.length);
  bar1.start();

  const { results, errors } = await PromisePool
    .for(media_source)
    .process(async media_item => {
      if (op) {
        await lib._setWatched(media_item, true);
      } else {
        await lib._setUnwatched(media_item, true);
      }
      bar1.increment();
      return media_item;
    });

  bar1.update(media_source.length);
  bar1.stop();
  logger.makeSpace(2);
  logger.success(`Done.`);

  logger.success('All sync tasks complete.');
  lib._disconnect();
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
  try {
    await configure();
  } catch (err) {
    console.log(err);
  }

}

// Having trouble with async forEach.
// Creating a helper based on the blog post here: https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

(() => {
  run();
})()