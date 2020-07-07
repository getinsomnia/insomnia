// @flow
import type { ApiSpec, BaseModel, Environment, UnitTestSuite, Workspace } from './types';
import { AutoComplete } from 'enquirer';
import type { Database } from './index';
import { mustFindSingle, mustFindSingleOrNone } from './index';
import flattenDeep from 'lodash.flattendeep';

export const matchIdIsh = ({ _id }: BaseModel, identifier: string) => _id.startsWith(identifier);
export const generateIdIsh = ({ _id }: BaseModel, length: number = 10) => _id.substr(0, length);

export function indent(level: number, code: string, tab: string = '  |'): string {
  if (!level || level < 0) {
    return code;
  }

  const prefix = new Array(level + 1).join(tab);
  return `${prefix} ${code}`;
}

const getDbChoice = (
  idIsh: string,
  message: string,
  config: { indent?: number, hint?: string } = {},
) => ({
  name: idIsh,
  message: indent(config.indent || 0, message),
  value: `${message} - ${idIsh}`,
  hint: config.hint || `${idIsh}`,
});

export function loadApiSpec(db: Database, identifier: string): ?ApiSpec {
  return mustFindSingleOrNone(
    db.ApiSpec,
    s => matchIdIsh(s, identifier) || s.fileName === identifier,
  );
}

export function loadWorkspace(db: Database, identifier: string): ?Workspace {
  return mustFindSingleOrNone(
    db.Workspace,
    s => matchIdIsh(s, identifier) || s.name === identifier,
  );
}

export async function promptApiSpec(db: Database, ci: boolean): Promise<?ApiSpec> {
  if (ci || !db.ApiSpec.length) {
    return null;
  }

  const prompt = new AutoComplete({
    name: 'apiSpec',
    message: 'Select an API Specification',
    choices: db.ApiSpec.map(s => getDbChoice(generateIdIsh(s), s.fileName)),
  });

  const [idIsh] = (await prompt.run()).split(' - ').reverse();
  return loadApiSpec(db, idIsh);
}

export function loadTestSuites(db: Database, identifier: string): Array<UnitTestSuite> {
  const apiSpec = loadApiSpec(db, identifier);
  const workspace = loadWorkspace(db, apiSpec?.parentId || identifier);

  // if identifier is for an apiSpec or a workspace, return all suites for that workspace
  if (workspace) {
    return db.UnitTestSuite.filter(s => s.parentId === workspace._id);
  }

  // Identifier is for one specific suite; find it
  const result = mustFindSingleOrNone(
    db.UnitTestSuite,
    s => matchIdIsh(s, identifier) || s.name === identifier,
  );

  return result ? [result] : [];
}

export async function promptTestSuites(db: Database, ci: boolean): Promise<Array<UnitTestSuite>> {
  if (ci) {
    return [];
  }

  const choices = db.ApiSpec.map(spec => [
    getDbChoice(generateIdIsh(spec), spec.fileName),
    ...db.UnitTestSuite.filter(suite => suite.parentId === spec.parentId).map(suite =>
      getDbChoice(generateIdIsh(suite), suite.name, { indent: 1 }),
    ),
  ]);

  if (!choices.length) {
    return [];
  }

  const prompt = new AutoComplete({
    name: 'testSuite',
    message: 'Select a document or unit test suite',
    choices: flattenDeep(choices),
  });

  const [idIsh] = (await prompt.run()).split(' - ').reverse();
  return loadTestSuites(db, idIsh);
}

export function loadEnvironment(
  db: Database,
  workspaceId: string,
  identifier?: string,
): ?Environment {
  if (!db.Environment.length) {
    return null;
  }

  // Get the sub environments
  const baseWorkspaceEnv = mustFindSingle(db.Environment, e => e.parentId === workspaceId);
  const subEnvs = db.Environment.filter(e => e.parentId === baseWorkspaceEnv._id);

  // try to find a sub env, otherwise return the base env
  return identifier && subEnvs.length
    ? subEnvs.find(e => matchIdIsh(e, identifier) || e.name === identifier)
    : baseWorkspaceEnv;
}

export async function promptEnvironment(
  db: Database,
  ci: boolean,
  workspaceId: string,
): Promise<?Environment> {
  if (ci || !db.Environment.length) {
    return null;
  }

  // Get the sub environments
  const baseWorkspaceEnv = mustFindSingle(db.Environment, e => e.parentId === workspaceId);
  const subEnvs = db.Environment.filter(e => e.parentId === baseWorkspaceEnv._id);

  if (!subEnvs.length) {
    return baseWorkspaceEnv;
  }

  const prompt = new AutoComplete({
    name: 'environment',
    message: `Select an environment`,
    choices: subEnvs.map(e => getDbChoice(generateIdIsh(e, 14), e.name)),
  });

  const [idIsh] = (await prompt.run()).split(' - ').reverse();
  return mustFindSingle(db.Environment, e => matchIdIsh(e, idIsh));
}
