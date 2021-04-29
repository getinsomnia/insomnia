import { $Keys } from 'utility-types';
import { showModal } from '../../components/modals';
import AskModal from '../../components/modals/ask-modal';
import { WorkspaceScope, WorkspaceScopeKeys } from '../../../models/workspace';
export const ForceToWorkspaceKeys = {
  new: 'new',
  current: 'current',
};
export type ForceToWorkspace = $Keys<typeof ForceToWorkspaceKeys>;
export type ImportToWorkspacePrompt = () => null | string | Promise<null | string>;
export function askToImportIntoWorkspace(workspaceId: string, forceToWorkspace?: ForceToWorkspace): ImportToWorkspacePrompt {
  return function () {
    switch (forceToWorkspace) {
      case ForceToWorkspaceKeys.new:
        return null;

      case ForceToWorkspaceKeys.current:
        return workspaceId;

      default:
        return new Promise(resolve => {
          showModal(AskModal, {
            title: 'Import',
            message: 'Do you want to import into the current workspace or a new one?',
            yesText: 'Current',
            noText: 'New Workspace',
            onDone: yes => {
              resolve(yes ? workspaceId : null);
            },
          });
        });
    }
  };
}

export type SetWorkspaceScopePrompt = (name: string) => WorkspaceScope | Promise<WorkspaceScope>;
export function askToSetWorkspaceScope(scope?: WorkspaceScope): SetWorkspaceScopePrompt {
  return function (name: string) {
    switch (scope) {
      case WorkspaceScopeKeys.collection:
      case WorkspaceScopeKeys.design:
        return scope;

      default:
        return new Promise(resolve => {
          showModal(AskModal, {
            title: 'Import As',
            message: `How would you like to import "${name}"?`,
            noText: 'Request Collection',
            yesText: 'Design Document',
            onDone: yes => {
              // @ts-expect-error convert WorkspaceScope to an enum
              resolve(yes ? WorkspaceScopeKeys.design : WorkspaceScopeKeys.collection);
            },
          });
        });
    }
  };
}
