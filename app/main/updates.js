// @flow
import electron from 'electron';
import {CHECK_FOR_UPDATES_INTERVAL, getAppVersion, isDevelopment, UPDATE_URL_MAC, UPDATE_URL_WINDOWS} from '../common/constants';
import * as models from '../models/index';
import * as querystring from '../common/querystring';
import {delay} from '../common/misc';

const {autoUpdater, BrowserWindow, ipcMain} = electron;

async function getUpdateUrl (): Promise<string | null> {
  const platform = process.platform;
  const settings = await models.settings.getOrCreate();
  let updateUrl = null;

  if (platform === 'win32') {
    updateUrl = UPDATE_URL_WINDOWS;
  } else if (platform === 'darwin') {
    updateUrl = UPDATE_URL_MAC;
  } else {
    return null;
  }

  const params = [
    {name: 'v', value: getAppVersion()},
    {name: 'channel', value: settings.updateChannel}
  ];

  const qs = querystring.buildFromParams(params);
  const fullUrl = querystring.joinUrl(updateUrl, qs);
  console.log(`[updater] Using url ${fullUrl}`);

  if (isDevelopment()) {
    return null;
  }

  if (!settings.updateAutomatically) {
    return null;
  }

  return fullUrl;
}

function _sendUpdateStatus (status) {
  const windows = BrowserWindow.getAllWindows();
  for (const w of windows) {
    w.send('updater.check.status', status);
  }
}

function _sendUpdateComplete (success: boolean, msg: string) {
  _sendUpdateStatus(msg);
  setTimeout(() => {
    const windows = BrowserWindow.getAllWindows();
    for (const w of windows) {
      w.send('updater.check.complete', success);
    }
  }, 1500);
}

let hasPromptedForUpdates = false;

export async function init () {
  autoUpdater.on('error', e => {
    console.warn(`[updater] Error: ${e.message}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.debug('[updater] Not Available');
    _sendUpdateComplete(false, 'Up to Date');
  });

  autoUpdater.on('update-available', () => {
    console.debug('[updater] Update Available');
    _sendUpdateStatus('Downloading');
  });

  autoUpdater.on('update-downloaded', (e, releaseNotes, releaseName, releaseDate, updateUrl) => {
    console.debug(`[updater] Downloaded ${releaseName}`);
    _sendUpdateStatus('Installing');
    setTimeout(() => {
      _showUpdateNotification();
      _sendUpdateComplete(true, 'Restart Required');
    }, 1000);
  });

  ipcMain.on('updater.check', async e => {
    await _checkForUpdates(true);
  });

  // Check for updates on an interval
  setInterval(async () => {
    await _checkForUpdates(false);
  }, CHECK_FOR_UPDATES_INTERVAL);

  // Check for updates immediately
  await _checkForUpdates(false);
}

function _showUpdateNotification () {
  if (hasPromptedForUpdates) {
    return;
  }

  const windows = BrowserWindow.getAllWindows();
  if (windows.length && windows[0].webContents) {
    windows[0].webContents.send('update-available');
  }

  hasPromptedForUpdates = true;
}

async function _checkForUpdates (force: boolean) {
  _sendUpdateStatus('Checking');
  await delay(500);

  if (force) {
    hasPromptedForUpdates = false;
  }

  if (hasPromptedForUpdates) {
    // We've already prompted for updates. Don't bug the user anymore
    return;
  }

  const updateUrl = await getUpdateUrl();

  if (updateUrl === null) {
    console.debug(`[updater] Updater not running platform=${process.platform} dev=${isDevelopment()}`);
    _sendUpdateComplete(false, 'Updates Not Supported');
    return;
  }

  try {
    console.debug(`[updater] Checking for updates url=${updateUrl}`);
    autoUpdater.setFeedURL(updateUrl);
    autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn('[updater] Failed to check for updates:', err.message);
    _sendUpdateComplete(false, 'Update Error');
  }
}
