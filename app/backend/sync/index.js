import * as db from '../database';
import * as fetch from '../fetch';
import * as crypt from './crypt';
import * as session from './session';
import * as store from './storage';
import Logger from './logger';

export const FULL_SYNC_INTERVAL = 60E3;
export const QUEUE_DEBOUNCE_TIME = 1E3;
export const PUSH_DEBOUNCE_TIME = 10E3;
export const START_PULL_DELAY = 2E3;
export const START_PUSH_DELAY = 1E3;

const WHITE_LIST = {
  [db.request.type]: true,
  [db.requestGroup.type]: true,
  [db.workspace.type]: true,
  [db.environment.type]: true,
  [db.cookieJar.type]: true
};

export const logger = new Logger();

// TODO: Move this stuff somewhere else
const NO_VERSION = '__NO_VERSION__';
const resourceGroupCache = {};
const resourceGroupSymmetricKeysCache = {};

let isInitialized = false;
export async function initSync () {
  const settings = await db.settings.getOrCreate();
  if (!settings.optSyncBeta) {
    logger.debug('Not enabled');
    return;
  }

  if (isInitialized) {
    logger.debug('Already enabled');
    return;
  }

  db.onChange(changes => {
    for (const [event, doc, fromSync] of changes) {
      if (!WHITE_LIST[doc.type]) {
        continue;
      }

      if (fromSync) {
        // Change was triggered from sync, so do nothing.
        continue;
      }

      // Make sure it happens async
      process.nextTick(() => _queueChange(event, doc, fromSync));
    }
  });

  setTimeout(pull, START_PULL_DELAY);
  setTimeout(pushActiveDirtyResources, START_PUSH_DELAY);
  setInterval(pull, FULL_SYNC_INTERVAL);
  isInitialized = true;
  logger.debug('Initialized');
}

/**
 * Trigger a full sync cycle. Useful if you don't want to wait for the next
 * tick.
 */
export async function triggerSync () {
  await initSync();
  await pushActiveDirtyResources();
  await pull();
}

/**
 * Non-blocking function to perform initial sync for an account. This will pull
 * all remote resources (if they exist) before initializing sync.
 */
export function doInitialSync () {
  process.nextTick(async () => {
    // First, pull down all remote resources, without first creating new ones.
    // This makes sure that the first sync won't create resources locally, when
    // they already exist on the server.
    await pull(null, false);

    // Make sure all other resources were created
    await _getOrCreateAllActiveResources();

    // Make sure sync is on (start the timers)
    await initSync();
  });
}

export async function pushActiveDirtyResources (resourceGroupId = null) {
  if (!session.isLoggedIn()) {
    logger.warn('Not logged in');
    return;
  }

  let dirtyResources = [];
  if (resourceGroupId) {
    dirtyResources = await store.findActiveDirtyResourcesForResourceGroup(resourceGroupId)
  } else {
    dirtyResources = await store.findActiveDirtyResources()
  }

  if (!dirtyResources.length) {
    logger.debug('No changes to push');
    return;
  }

  let responseBody;
  try {
    responseBody = await fetch.post('/sync/push', dirtyResources);
  } catch (e) {
    logger.error('Failed to push changes', e);
    return;
  }

  const {
    updated,
    created,
    removed,
    conflicts,
  } = responseBody;

  // Update all resource versions with the ones that were returned
  for (const {id, version} of updated) {
    const resource = await store.getResourceByDocId(id);
    await store.updateResource(resource, {version, dirty: false});
    // logger.debug(`Push updated ${id}`);
  }

  // Update all resource versions with the ones that were returned
  for (const {id, version} of created) {
    const resource = await store.getResourceByDocId(id);
    await store.updateResource(resource, {version, dirty: false});
    // logger.debug(`Push created ${id}`);
  }

  // Update all resource versions with the ones that were returned
  for (const {id, version} of removed) {
    const resource = await store.getResourceByDocId(id);
    await store.updateResource(resource, {version, dirty: false});
    // logger.debug(`Push removed ${id}`);
  }

  // Resolve conflicts
  for (const serverResource of conflicts) {
    const localResource = await store.getResourceByDocId(serverResource.id);

    // On conflict, choose last edited one
    const serverIsNewer = serverResource.lastEdited > localResource.lastEdited;
    const winner = serverIsNewer ? serverResource : localResource;

    // Decrypt the docs from the resources. Don't fetch the local doc from the
    // app database, because it might have been deleted.
    logger.debug(`Resolved conflict for ${serverResource.id} (${serverIsNewer ? 'Server' : 'Local'})`, winner);

    // Update local resource
    // NOTE: using localResource as the base to make sure we have _id
    await store.updateResource(localResource, winner, {
      version: serverResource.version, // Act as the server resource no matter what
      dirty: !serverIsNewer // It's dirty if we chose the local doc
    });

    // If the server won, update ourselves. If we won, we already have the
    // latest version, so do nothing.
    if (serverIsNewer) {
      const doc = await _decryptDoc(winner.resourceGroupId, winner.encContent);
      if (winner.removed) {
        await db.remove(doc, true);
      } else {
        await db.update(doc, true);
      }
    }
  }
}

export async function pull (resourceGroupId = null, createMissingResources = true) {
  if (!session.isLoggedIn()) {
    logger.warn('Not logged in');
    return;
  }

  let allResources;
  if (createMissingResources) {
    allResources = await _getOrCreateAllActiveResources(resourceGroupId);
  } else {
    allResources = await store.allActiveResources(resourceGroupId);
  }

  let blacklistedConfigs;
  if (resourceGroupId) {
    // When doing a partial sync, blacklist all configs except the one we're
    // trying to sync.
    const allConfigs = await store.allConfigs();
    blacklistedConfigs = allConfigs.filter(c => c.resourceGroupId !== resourceGroupId)
  } else {
    // When doing a full sync, blacklist the inactive configs
    blacklistedConfigs = await store.findInactiveConfigs(resourceGroupId);
  }

  const resources = allResources.map(r => ({
    id: r.id,
    resourceGroupId: r.resourceGroupId,
    version: r.version,
    removed: r.removed
  }));

  const blacklistedResourceGroupIds = blacklistedConfigs.map(c => c.resourceGroupId);
  const body = {resources, blacklist: blacklistedResourceGroupIds};

  logger.debug(`Pulling with ${resources.length} resources`);

  let responseBody;
  try {
    responseBody = await fetch.post('/sync/pull', body);
  } catch (e) {
    logger.error('Failed to sync changes', e, body);
    return;
  }

  const {
    updatedResources,
    createdResources,
    idsToPush,
    idsToRemove,
  } = responseBody;

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  // Insert all the created docs to the DB //
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  await createdResources.map(async serverResource => {
    let doc;

    try {
      const {resourceGroupId, encContent} = serverResource;
      doc = await _decryptDoc(resourceGroupId, encContent);
    } catch (e) {
      logger.warn('Failed to decode created resource', e, serverResource);
      return;
    }

    // Update local Resource
    try {
      await store.insertResource(serverResource, {dirty: false});
    } catch (e) {
      // This probably means we already have it. This should never happen, but
      // might due to a rare race condition.
      logger.error('Failed to insert resource', e);
      return;
    }

    // NOTE: If the above Resource insert succeeded, that means we have safely
    // insert the document. However, we're using an upsert here instead because
    // it's very possible that the client already had that document locally.
    // This might happen, for example, if the user logs out and back in again.
    await db.upsert(doc, true);
  });

  if (createdResources.length) {
    logger.debug(`Pull created ${createdResources.length} resources`);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  // Save all the updated docs to the DB //
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  await updatedResources.map(async serverResource => {
    try {
      const {resourceGroupId, encContent} = serverResource;
      const doc = await _decryptDoc(resourceGroupId, encContent);

      // Update app database
      await db.update(doc, true);

      // Update local resource
      const resource = await store.getResourceByDocId(serverResource.id);
      await store.updateResource(resource, serverResource, {dirty: false});
    } catch (e) {
      logger.warn('Failed to decode updated resource', e, serverResource);
    }
  });

  if (updatedResources.length) {
    logger.debug(`Pull updated ${updatedResources.length} resources`);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  // Remove all the docs that need removing //
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  for (const id of idsToRemove) {
    const resource = await store.getResourceByDocId(id);
    if (!resource) {
      throw new Error(`Could not find Resource to remove for ${id}`)
    }

    const doc = await _decryptDoc(resource.resourceGroupId, resource.encContent);
    if (!doc) {
      throw new Error(`Could not find doc to remove ${id}`)
    }

    // Mark resource as deleted
    await store.updateResource(resource, {dirty: false, removed: true});

    // Remove from DB
    await db.remove(doc, true);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  // Push all the docs that need pushing //
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  for (const id of idsToPush) {
    const resource = await store.getResourceByDocId(id);
    if (!resource) {
      throw new Error(`Could not find Resource to push for id ${id}`)
    }

    // Mark all resources to push as dirty for the next push
    await store.updateResource(resource, {dirty: true});
  }

  // Push all the resources that may have been marked as dirty
  await pushActiveDirtyResources();

  return updatedResources.length + createdResources.length;
}

export async function getOrCreateConfig (resourceGroupId) {
  const config = await store.getConfig(resourceGroupId);

  if (!config) {
    return await store.insertConfig({resourceGroupId});
  } else {
    return config;
  }
}

export async function createOrUpdateConfig (resourceGroupId, syncMode) {
  const config = await store.getConfig(resourceGroupId);
  const patch = {resourceGroupId, syncMode};

  if (config) {
    return await store.updateConfig(config, patch);
  } else {
    return await store.insertConfig(patch);
  }
}

export async function logout () {
  await resetLocalData();
  await session.logout();
}

export async function cancelAccount () {
  await session.cancelAccount();
  await logout();
}

export async function resetLocalData () {
  for (const r of await store.allResources()) {
    await store.removeResource(r);
  }

  for (const c of await store.allConfigs()) {
    await store.removeConfig(c);
  }
}

export async function resetRemoteData () {
  await fetch.post('/auth/reset');
}

// ~~~~~~~ //
// HELPERS //
// ~~~~~~~ //

let _queuedChanges = {};
let _queuedChangesTimeout = null;
let _pushChangesTimeout = null;

async function _queueChange (event, doc) {
  if (!session.isLoggedIn()) {
    logger.warn('Not logged in');
    return;
  }

  // How this works?
  // First, debounce updates to Resources because they are heavy (encryption)
  // Second, debounce pushes to the server, because they are slow (network)
  // ... Using _queuedChanges as a map so that future changes to the same doc
  //     don't trigger more than 1 update.

  // NOTE: Don't use doc.modified because that doesn't work for removal
  _queuedChanges[doc._id + event] = [event, doc, Date.now()];

  clearTimeout(_queuedChangesTimeout);
  _queuedChangesTimeout = setTimeout(async () => {

    const queuedChangesCopy = Object.assign({}, _queuedChanges);
    _queuedChanges = {};

    for (const k of Object.keys(queuedChangesCopy)) {
      const [event, doc, timestamp] = queuedChangesCopy[k];

      // Update the resource content and set dirty
      // TODO: Remove one of these steps since it does encryption twice
      // in the case where the resource does not exist yet
      const resource = await getOrCreateResourceForDoc(doc);
      const updatedResource = await store.updateResource(resource, {
        name: doc.name || 'n/a',
        lastEdited: timestamp,
        lastEditedBy: session.getAccountId(),
        encContent: await _encryptDoc(resource.resourceGroupId, doc),
        removed: event === db.CHANGE_REMOVE,
        dirty: true
      });

      // Debounce pushing of dirty resources
      logger.debug(`Queue ${event} ${updatedResource.id}`);
      clearTimeout(_pushChangesTimeout);
      _pushChangesTimeout = setTimeout(() => pushActiveDirtyResources(), PUSH_DEBOUNCE_TIME);
    }
  }, QUEUE_DEBOUNCE_TIME);
}

/**
 * Fetch a ResourceGroup. If it has been fetched before, lookup from memory
 *
 * @param resourceGroupId
 * @returns {*}
 */
const _fetchResourceGroupPromises = {};
function _fetchResourceGroup (resourceGroupId) {
  // PERF: If we're currently fetching, return stored promise
  // TODO: Maybe move parallel fetch caching into the fetch helper
  if (_fetchResourceGroupPromises[resourceGroupId]) {
    return _fetchResourceGroupPromises[resourceGroupId];
  }

  const promise = new Promise(async (resolve, reject) => {
    let resourceGroup = resourceGroupCache[resourceGroupId];

    if (!resourceGroup) {
      // TODO: Handle a 404 here
      try {
        resourceGroup = await fetch.get(
          `/api/resource_groups/${resourceGroupId}`
        );
      } catch (e) {
        logger.error(`Failed to get ResourceGroup ${resourceGroupId}: ${e}`);
        reject(e);
      }

      // Also make sure a config exists when we first fetch it.
      // TODO: This exists in multiple places, so move it to one place.
      createOrUpdateConfig(resourceGroupId, store.SYNC_MODE_OFF);
    }

    // Bust cached promise because we're done with it.
    _fetchResourceGroupPromises[resourceGroupId] = null;

    // Cache the ResourceGroup for next time (they never change)
    resourceGroupCache[resourceGroupId] = resourceGroup;

    // Return the ResourceGroup
    resolve(resourceGroup);
  });

  // Cache the Promise in case we get asked for the same thing before done
  _fetchResourceGroupPromises[resourceGroupId] = promise;
  return promise;
}

/**
 * Get a ResourceGroup's symmetric encryption key
 *
 * @param resourceGroupId
 * @private
 */
async function _getResourceGroupSymmetricKey (resourceGroupId) {
  let key = resourceGroupSymmetricKeysCache[resourceGroupId];

  if (!key) {
    const resourceGroup = await _fetchResourceGroup(resourceGroupId);
    const accountPrivateKey = await session.getPrivateKey();

    const symmetricKeyStr = crypt.decryptRSAWithJWK(
      accountPrivateKey,
      resourceGroup.encSymmetricKey
    );

    key = JSON.parse(symmetricKeyStr);

    // Update cache
    resourceGroupSymmetricKeysCache[resourceGroupId] = key;
  }

  return key;
}

async function _encryptDoc (resourceGroupId, doc) {
  try {
    const symmetricKey = await _getResourceGroupSymmetricKey(resourceGroupId);
    const docStr = JSON.stringify(doc);
    const message = crypt.encryptAES(symmetricKey, docStr);
    return JSON.stringify(message);
  } catch (e) {
    logger.error(`Failed to encrypt for ${resourceGroupId}: ${e}`);
    throw e;
  }
}

async function _decryptDoc (resourceGroupId, messageJSON) {
  try {
    const symmetricKey = await _getResourceGroupSymmetricKey(resourceGroupId);
    const message = JSON.parse(messageJSON);
    const decrypted = crypt.decryptAES(symmetricKey, message);
    return JSON.parse(decrypted);
  } catch (e) {
    logger.error(`Failed to decrypt from ${resourceGroupId}: ${e}`);
    throw e;
  }
}

async function _getWorkspaceForDoc (doc) {
  const ancestors = await db.withAncestors(doc);
  return ancestors.find(d => d.type === db.workspace.type);
}

async function _createResourceGroup (name = '') {
  // Generate symmetric key for ResourceGroup
  const rgSymmetricJWK = await crypt.generateAES256Key();
  const rgSymmetricJWKStr = JSON.stringify(rgSymmetricJWK);

  // Encrypt the symmetric key with Account public key
  const publicJWK = session.getPublicKey();
  const encRGSymmetricJWK = crypt.encryptRSAWithJWK(publicJWK, rgSymmetricJWKStr);

  // Create the new ResourceGroup
  let resourceGroup;
  try {
    resourceGroup = await fetch.post('/api/resource_groups', {
      name,
      encSymmetricKey: encRGSymmetricJWK,
    });
  } catch (e) {
    logger.error(`Failed to create ResourceGroup: ${e}`);
    throw e
  }

  // Create a config for it
  await createOrUpdateConfig(resourceGroup.id, store.SYNC_MODE_OFF);

  logger.debug(`Created ResourceGroup ${resourceGroup.id}`);
  return resourceGroup;
}

async function _createResource (doc, resourceGroupId) {
  return store.insertResource({
    id: doc._id,
    name: doc.name || 'n/a', // Set name to the doc name if it has one
    resourceGroupId: resourceGroupId,
    version: NO_VERSION,
    createdBy: session.getAccountId(),
    lastEdited: doc.modified,
    lastEditedBy: session.getAccountId(),
    removed: false,
    type: doc.type,
    encContent: await _encryptDoc(resourceGroupId, doc),
    dirty: true
  });
}

async function _createResourceForDoc (doc) {
  // No resource yet, so create one
  const workspace = await _getWorkspaceForDoc(doc);

  if (!workspace) {
    throw new Error(`Could not find workspace for doc ${doc._id}`);
  }

  let workspaceResource = await store.getResourceByDocId(workspace._id);

  if (!workspaceResource) {
    const workspaceResourceGroup = await _createResourceGroup(workspace.name);
    await createOrUpdateConfig(workspaceResourceGroup.id, store.SYNC_MODE_OFF);
    workspaceResource = await _createResource(workspace, workspaceResourceGroup.id);
  }

  if (workspace === doc) {
    // If the current doc IS a Workspace, just return it
    return workspaceResource;
  } else {
    return await _createResource(doc, workspaceResource.resourceGroupId);
  }
}

export async function getOrCreateResourceForDoc (doc) {
  let resource = await store.getResourceByDocId(doc._id);

  if (resource) {
    return resource;
  } else {
    return await _createResourceForDoc(doc);
  }
}

async function _getOrCreateAllActiveResources (resourceGroupId = null) {
  const startTime = Date.now();
  const activeResourceMap = {};

  let activeResources;
  if (resourceGroupId) {
    activeResources = await store.activeResourcesForResourceGroup(resourceGroupId);
  } else {
    activeResources = await store.allActiveResources();
  }

  for (const r of activeResources) {
    activeResourceMap[r.id] = r;
  }

  for (const type of Object.keys(WHITE_LIST)) {
    for (const doc of await db.all(type)) {
      const resource = await store.getResourceByDocId(doc._id);
      if (!resource) {
        activeResourceMap[doc._id] = await _createResourceForDoc(doc);
      }
    }
  }

  const resources = Object.keys(activeResourceMap).map(k => activeResourceMap[k]);

  const time = (Date.now() - startTime) / 1000;
  logger.debug(`Created ${resources.length} Resources (${time.toFixed(2)}s)`);
  return resources;
}
