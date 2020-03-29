import fs from 'fs';
import _ from 'lodash';
import yaml from 'yaml';
import app_root from 'app-root-path';
import logger from 'rc_cli_util';

const defaultConfigFile = app_root + '/config/config.yml';

export class configLoader {
  static async load( file=defaultConfigFile ) {
    try {
      // Load available configuration from file first.
      const raw = await fs.promises.readFile(file, 'utf8');
      logger.status(`Loaded configuration from file: ${file}`);
      return yaml.parse(raw);
    } catch (err) {
      logger.status(`Skipping configuration file: ${file}`);
      return {};
    }
  }
}

export default class configStore {

  constructor() {
    this.config = false;
    this.staged = false;
  }

  async loadDefaults() {
    this.config = await configLoader.load();
    return this;
  }

  async load(file) {
    const config = await configLoader.load(file);
    this.setConfig(config);
    this.save();
  }

  setConfig(config) {
    this.staged = config;
    return this;
  }

  getConfig() {
    return this.config;
  }
  get(path) {
    return _.get(this.getConfig(), path);
  }

  save() {
    if (this.staged && typeof this.staged === 'object') {
      this.config = this.staged;
    }

    this.staged = false;
    return this;
  }

}