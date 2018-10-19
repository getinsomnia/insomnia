const electronBuilder = require('electron-builder');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('fs');
const buildTask = require('./build');

const PLATFORM_MAP = {
  darwin: 'mac',
  linux: 'linux',
  win32: 'win'
};

// Start package if ran from CLI
if (require.main === module) {
  process.nextTick(async () => {
    try {
      await buildTask.start();
      await module.exports.start();
    } catch (err) {
      console.log('ERROR MESSAGE: ', err.message);
      console.log('ERROR STACK:   ', err.stack);
      console.log('ERROR:         ', err);
      process.exit(1);
    }
  });
}

module.exports.start = async function() {
  console.log('[package] Removing existing directories');
  await emptyDir('../dist/*');

  console.log('[package] Packaging app');
  await pkg('../.electronbuilder');

  console.log('[package] Complete!');
};

async function pkg(relConfigPath) {
  const configPath = path.resolve(__dirname, relConfigPath);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const targetPlatform = PLATFORM_MAP[process.platform];
  return electronBuilder.build({
    config,
    [targetPlatform]: config[targetPlatform].target
  });
}

async function emptyDir(relPath) {
  return new Promise((resolve, reject) => {
    const dir = path.resolve(__dirname, relPath);
    rimraf(dir, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
