'use strict';

const db = require('../index');

export const type = 'Stats';
export const prefix = 'sta';
export const slug = 'stats';
export function init () {
  return db.initModel({
    lastLaunch: Date.now(),
    lastVersion: null,
    launches: 0
  });
}

export function create (patch = {}) {
  return db.docCreate(type, patch);
}

export async function update (patch) {
  const stats = await get();
  return db.docUpdate(stats, patch);
}

export async function get () {
  const results = await db.all(type);
  if (results.length === 0) {
    return await create();
  } else {
    return results[0];
  }
}
