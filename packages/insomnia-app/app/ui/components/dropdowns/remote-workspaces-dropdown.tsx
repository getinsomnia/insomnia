import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import VCS from '../../../sync/vcs';
import type { Project } from '../../../sync/types';
import { Dropdown, DropdownDivider, DropdownItem, Button, Tooltip } from 'insomnia-components';
import HelpTooltip from '../help-tooltip';
import { showAlert } from '../modals';
import { strings } from '../../../common/strings';
import { useSelector } from 'react-redux';
import { selectActiveSpace, selectAllWorkspaces } from '../../redux/selectors';
import { isLoggedIn } from '../../../account/session';
import { isNotNullOrUndefined } from '../../../common/misc';
import { pullProject } from '../../../sync/vcs/pull-project';

interface Props {
  className?: string;
  vcs?: VCS | null;
}

const useRemoteWorkspaces = (vcs?: VCS) => {
  // Fetch from redux
  const workspaces = useSelector(selectAllWorkspaces);
  const activeSpace = useSelector(selectActiveSpace);
  const spaceRemoteId = activeSpace?.remoteId || undefined;
  const isRemoteSpace = isNotNullOrUndefined(spaceRemoteId);
  const spaceId = activeSpace?._id;

  // Local state
  const [loading, setLoading] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<Project[]>([]);
  const [pullingProjects, setPullingProjects] = useState<Record<string, boolean>>({});

  // Refresh remote spaces
  const refresh = useCallback(async () => {
    if (!vcs || !isLoggedIn()) {
      return;
    }

    setLoading(true);
    const remote = await vcs.remoteProjects(spaceRemoteId);
    const local = await vcs.localProjects();
    setRemoteProjects(remote);
    setLocalProjects(local);
    setLoading(false);
  },
  [spaceRemoteId, vcs]);

  // Find remote spaces that haven't been pulled
  const missingProjects = useMemo(() => remoteProjects.filter(({ id, rootDocumentId }) => {
    const localProjectExists = localProjects.find(p => p.id === id);
    const workspaceExists = workspaces.find(w => w._id === rootDocumentId);
    // Mark as missing if:
    //   - the project doesn't yet exists locally
    //   - the project exists locally but somehow the workspace doesn't anymore
    return !(workspaceExists && localProjectExists);
  }), [localProjects, remoteProjects, workspaces]);

  // Pull a remote space
  const pull = useCallback(async (project: Project) => {
    if (!vcs) {
      throw new Error('VCS is not defined');
    }

    setPullingProjects(state => ({ ...state, [project.id]: true }));

    try {
      // Clone old VCS so we don't mess anything up while working on other projects
      const newVCS = vcs.newInstance();
      // Remove all projects for workspace first
      await newVCS.removeProjectsForRoot(project.rootDocumentId);

      await pullProject({ vcs: newVCS, project, spaceId });

      await refresh();
    } catch (err) {
      showAlert({
        title: 'Pull Error',
        message: `Failed to pull workspace. ${err.message}`,
      });
    } finally {
      setPullingProjects(state => ({ ...state, [project.id]: false }));
    }
  }, [vcs, refresh, spaceId]);

  // If the refresh callback changes, refresh
  useEffect(() => {
    (async () => { await refresh(); })();
  }, [refresh]);

  return {
    isRemoteSpace,
    loading,
    missingProjects,
    pullingProjects,
    refresh,
    pull,
  };
};

const PullButton: FC<{disabled?: boolean, className?: string}> = ({ disabled, className }) => (
  <Button className={className} disabled={disabled}>
      Pull
    <i className="fa fa-caret-down pad-left-sm" />
  </Button>
);

export const RemoteWorkspacesDropdown: FC<Props> = ({ className, vcs }) => {
  const {
    isRemoteSpace,
    loading,
    refresh,
    missingProjects,
    pullingProjects,
    pull,
  } = useRemoteWorkspaces(vcs || undefined);

  // Don't show the pull dropdown if this is not a remote space
  if (!isRemoteSpace) {
    return null;
  }

  // Show a disabled button if remote space but not logged in
  if (!isLoggedIn()) {
    return (
      <Tooltip message="Please log in to access your remote collections" position="bottom">
        <PullButton className={className} disabled />
      </Tooltip>
    );
  }

  return (
    <Dropdown onOpen={refresh} renderButton={<PullButton className={className} />}>
      <DropdownDivider>
        Remote {strings.collection.plural}
        <HelpTooltip>
          These {strings.collection.plural.toLowerCase()} have been shared with you via Insomnia
          Sync and do not yet exist on your machine.
        </HelpTooltip>{' '}
        {loading && <i className="fa fa-spin fa-refresh" />}
      </DropdownDivider>
      {missingProjects.length === 0 && (
        <DropdownItem disabled>Nothing to pull</DropdownItem>
      )}
      {missingProjects.map(p => (
        <DropdownItem
          key={p.id}
          stayOpenAfterClick
          value={p}
          onClick={pull}
          icon={
            pullingProjects[p.id] ? (
              <i className="fa fa-refresh fa-spin" />
            ) : (
              <i className="fa fa-cloud-download" />
            )
          }>
          <span>
            Pull <strong>{p.name}</strong>
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
};
