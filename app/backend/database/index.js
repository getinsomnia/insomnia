import electron from 'electron';
import NeDB from 'nedb';
import fsPath from 'path';
import {DB_PERSIST_INTERVAL} from  '../constants';
import {generateId} from '../util';
import {isDevelopment} from '../appInfo';

import * as stats from './models/stats';
import * as settings from './models/settings';
import * as workspace from './models/workspace';
import * as environment from './models/environment';
import * as cookieJar from './models/cookieJar';
import * as requestGroup from './models/requestGroup';
import * as request from './models/request';
import * as response from './models/response';

export const CHANGE_INSERT = 'insert';
export const CHANGE_UPDATE = 'update';
export const CHANGE_REMOVE = 'remove';


// ~~~~~~ //
// MODELS //
// ~~~~~~ //

const MODELS = [
  stats,
  settings,
  workspace,
  environment,
  cookieJar,
  requestGroup,
  request,
  response
];

module.exports.stats = stats;
module.exports.settings = settings;
module.exports.workspace = workspace;
module.exports.environment = environment;
module.exports.cookieJar = cookieJar;
module.exports.requestGroup = requestGroup;
module.exports.request = request;
module.exports.response = response;

const MODEL_MAP = {};

export function initModel (doc) {
  return Object.assign({
    modified: Date.now(),
    created: Date.now(),
    parentId: null
  }, doc);
}

export const ALL_TYPES = MODELS.map(m => m.type);

for (const model of MODELS) {
  MODEL_MAP[model.type] = model;
}


// ~~~~~~~ //
// HELPERS //
// ~~~~~~~ //

let db = null;

function getDBFilePath (modelType) {
  // NOTE: Do not EVER change this. EVER!
  const basePath = electron.remote.app.getPath('userData');
  return fsPath.join(basePath, `insomnia.${modelType}.db`);
}

/**
 * Initialize the database. This should be called once on app start.
 * @returns {Promise}
 */
let initialized = false;

/**
 * Initialize the database. Note that this isn't actually async, but might be
 * in the future!
 *
 * @param config
 * @param force
 * @returns {null}
 */
export async function initDB (config = {}, force = false) {
  // Only init once
  if (initialized && !force) {
    return null;
  }

  db = {};

  if (isDevelopment()) {
    global.db = db;
  }

  // Fill in the defaults

  ALL_TYPES.map(t => {
    const filename = getDBFilePath(t);
    const autoload = true;
    const finalConfig = Object.assign({filename, autoload}, config);

    db[t] = new NeDB(finalConfig);
    db[t].persistence.setAutocompactionInterval(DB_PERSIST_INTERVAL)
  });

  // Done

  initialized = true;
  console.log(`-- Initialize DB at ${getDBFilePath('t')} --`);
}


// ~~~~~~~~~~~~~~~~ //
// Change Listeners //
// ~~~~~~~~~~~~~~~~ //

let bufferingChanges = false;
let changeBuffer = [];
let changeListeners = [];

export function onChange (callback) {
  console.log(`-- Added DB Listener -- `);
  changeListeners.push(callback);
}

export function offChange (callback) {
  console.log(`-- Removed DB Listener -- `);
  changeListeners = changeListeners.filter(l => l !== callback);
}

export function bufferChanges (millis = 1000) {
  bufferingChanges = true;
  setTimeout(flushChanges, millis);
}

export function flushChanges () {
  bufferingChanges = false;
  const changes = [...changeBuffer];
  changeBuffer = [];

  if (changes.length === 0) {
    // No work to do
    return;
  }

  // Notify async so we don't block
  process.nextTick(() => {
    changeListeners.map(fn => fn(changes));
  })
}

function notifyOfChange (event, doc) {
  changeBuffer.push([event, doc]);

  // Flush right away if we're not buffering
  if (!bufferingChanges) {
    flushChanges();
  }
}


// ~~~~~~~ //
// Helpers //
// ~~~~~~~ //

export function getMostRecentlyModified (type, query = {}) {
  return new Promise(resolve => {
    db[type].find(query).sort({modified: -1}).limit(1).exec((err, docs) => {
      resolve(docs.length ? docs[0] : null);
    })
  })
}

export function find (type, query = {}) {
  return new Promise((resolve, reject) => {
    db[type].find(query, (err, rawDocs) => {
      if (err) {
        return reject(err);
      }

      const modelDefaults = MODEL_MAP[type].init();
      const docs = rawDocs.map(rawDoc => {
        return Object.assign({}, modelDefaults, rawDoc);
      });

      resolve(docs);
    });
  });
}

export function all (type) {
  return find(type);
}

export function getWhere (type, query) {
  return new Promise((resolve, reject) => {
    db[type].find(query, (err, rawDocs) => {
      if (err) {
        return reject(err);
      }

      if (rawDocs.length === 0) {
        // Not found. Too bad!
        return resolve(null);
      }

      const modelDefaults = MODEL_MAP[type].init();
      resolve(Object.assign({}, modelDefaults, rawDocs[0]));
    })
  })
}

export function get (type, id) {
  return getWhere(type, {_id: id});
}

export function count (type, query = {}) {
  return new Promise((resolve, reject) => {
    db[type].count(query, (err, count) => {
      if (err) {
        return reject(err);
      }

      resolve(count);
    });
  });
}

export function insert (doc) {
  return new Promise((resolve, reject) => {
    db[doc.type].insert(doc, (err, newDoc) => {
      if (err) {
        return reject(err);
      }

      resolve(newDoc);
      notifyOfChange(CHANGE_INSERT, doc);
    });
  });
}

export function update (doc) {
  return new Promise((resolve, reject) => {
    db[doc.type].update({_id: doc._id}, doc, err => {
      if (err) {
        return reject(err);
      }

      resolve(doc);
      notifyOfChange(CHANGE_UPDATE, doc);
    });
  });
}

export async function remove (doc) {
  bufferChanges();

  const docs = await withDescendants(doc);
  const docIds = docs.map(d => d._id);
  const types = [...new Set(docs.map(d => d.type))];

  // Don't really need to wait for this to be over;
  types.map(t => db[t].remove({_id: {$in: docIds}}, {multi: true}));

  docs.map(d => notifyOfChange(CHANGE_REMOVE, d));

  flushChanges();
}

/**
 * Remove a lot of documents quickly and silently
 *
 * @param type
 * @param query
 * @returns {Promise.<T>}
 */
export function removeBulkSilently (type, query) {
  return new Promise(resolve => {
    db[type].remove(query, {multi: true}, err => resolve());
  });
}


// ~~~~~~~~~~~~~~~~~~~ //
// DEFAULT MODEL STUFF //
// ~~~~~~~~~~~~~~~~~~~ //

export function docUpdate (originalDoc, patch = {}) {
  const doc = Object.assign(
    MODEL_MAP[originalDoc.type].init(),
    originalDoc,
    patch,
    {modified: Date.now()}
  );

  return update(doc);
}

export function docCreate (type, patch = {}) {
  const idPrefix = MODEL_MAP[type].prefix;

  if (!idPrefix) {
    throw new Error(`No ID prefix for ${type}`)
  }

  const doc = Object.assign(
    {_id: generateId(idPrefix)},
    MODEL_MAP[type].init(),
    patch,

    // Fields that the user can't touch
    {
      type: type,
      modified: Date.now()
    }
  );

  return insert(doc);
}

// ~~~~~~~ //
// GENERAL //
// ~~~~~~~ //

export async function withDescendants (doc = null) {
  let docsToReturn = doc ? [doc] : [];

  async function next (docs) {
    let foundDocs = [];

    for (const d of docs) {
      for (const type of ALL_TYPES) {
        // If the doc is null, we want to search for parentId === null
        const parentId = d ? d._id : null;
        const more = await find(type, {parentId});
        foundDocs = [...foundDocs, ...more]
      }
    }

    if (foundDocs.length === 0) {
      // Didn't find anything. We're done
      return docsToReturn;
    }

    // Continue searching for children
    docsToReturn = [...docsToReturn, ...foundDocs];
    return await next(foundDocs);
  }

  return await next([doc]);
}

export async function duplicate (originalDoc, patch = {}) {
  bufferChanges();

  // 1. Copy the doc
  const newDoc = Object.assign({}, originalDoc, patch);
  delete newDoc._id;
  delete newDoc.created;
  delete newDoc.modified;

  const createdDoc = await docCreate(newDoc.type, newDoc);

  // 2. Get all the children
  for (const type of ALL_TYPES) {
    const parentId = originalDoc._id;
    const children = await find(type, {parentId});
    for (const doc of children) {
      await duplicate(doc, {parentId: createdDoc._id})
    }
  }

  flushChanges();

  return createdDoc;
}
