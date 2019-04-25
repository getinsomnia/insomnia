import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import classnames from 'classnames';
import EnvironmentsDropdown from '../dropdowns/environments-dropdown';
import SidebarFilter from './sidebar-filter';
import SidebarChildren from './sidebar-children';
import SyncDropdown from '../dropdowns/sync-dropdown';
import WorkspaceDropdown from '../dropdowns/workspace-dropdown';
import { SIDEBAR_SKINNY_REMS, COLLAPSE_SIDEBAR_REMS } from '../../../common/constants';
import SyncLegacyDropdown from '../dropdowns/sync-legacy-dropdown';
import { isLoggedIn } from '../../../account/session';

@autobind
class Sidebar extends PureComponent {
  _handleChangeEnvironment(id) {
    const { handleSetActiveEnvironment } = this.props;
    handleSetActiveEnvironment(id);
  }

  _handleCreateRequestInWorkspace() {
    const { workspace, handleCreateRequest } = this.props;
    handleCreateRequest(workspace._id);
  }

  _handleCreateRequestGroupInWorkspace() {
    const { workspace, handleCreateRequestGroup } = this.props;
    handleCreateRequestGroup(workspace._id);
  }

  render() {
    const {
      showCookiesModal,
      filter,
      childObjects,
      hidden,
      width,
      workspace,
      workspaces,
      unseenWorkspaces,
      environments,
      activeEnvironment,
      handleSetActiveWorkspace,
      handleChangeFilter,
      isLoading,
      handleCreateRequest,
      handleDuplicateRequest,
      handleDuplicateRequestGroup,
      handleMoveRequestGroup,
      handleGenerateCode,
      handleCopyAsCurl,
      handleCreateRequestGroup,
      handleSetRequestGroupCollapsed,
      handleSetRequestPinned,
      handleSetRequestGroupPinned,
      moveDoc,
      handleActivateRequest,
      activeRequest,
      environmentHighlightColorStyle,
      hotKeyRegistry,
      enableSyncBeta,
      vcs,
      syncItems,
    } = this.props;

    return (
      <aside
        className={classnames('sidebar', 'theme--sidebar', {
          'sidebar--hidden': hidden,
          'sidebar--skinny': width < SIDEBAR_SKINNY_REMS,
          'sidebar--collapsed': width < COLLAPSE_SIDEBAR_REMS,
        })}
        style={{
          borderRight:
            activeEnvironment &&
            activeEnvironment.color &&
            environmentHighlightColorStyle === 'sidebar-edge'
              ? '5px solid ' + activeEnvironment.color
              : null,
        }}>
        <WorkspaceDropdown
          className="sidebar__header theme--sidebar__header"
          activeWorkspace={workspace}
          workspaces={workspaces}
          unseenWorkspaces={unseenWorkspaces}
          hotKeyRegistry={hotKeyRegistry}
          handleSetActiveWorkspace={handleSetActiveWorkspace}
          enableSyncBeta={enableSyncBeta}
          isLoading={isLoading}
          vcs={vcs}
        />

        <div className="sidebar__menu">
          <EnvironmentsDropdown
            handleChangeEnvironment={this._handleChangeEnvironment}
            activeEnvironment={activeEnvironment}
            environments={environments}
            workspace={workspace}
            environmentHighlightColorStyle={environmentHighlightColorStyle}
            hotKeyRegistry={hotKeyRegistry}
          />
          <button className="btn btn--super-compact" onClick={showCookiesModal}>
            <div className="sidebar__menu__thing">
              <span>Cookies</span>
            </div>
          </button>
        </div>

        <SidebarFilter
          key={`${workspace._id}::filter`}
          onChange={handleChangeFilter}
          requestCreate={this._handleCreateRequestInWorkspace}
          requestGroupCreate={this._handleCreateRequestGroupInWorkspace}
          filter={filter || ''}
          hotKeyRegistry={hotKeyRegistry}
        />

        <SidebarChildren
          childObjects={childObjects}
          handleActivateRequest={handleActivateRequest}
          handleCreateRequest={handleCreateRequest}
          handleCreateRequestGroup={handleCreateRequestGroup}
          handleSetRequestGroupCollapsed={handleSetRequestGroupCollapsed}
          handleSetRequestPinned={handleSetRequestPinned}
          handleSetRequestGroupPinned={handleSetRequestGroupPinned}
          handleDuplicateRequest={handleDuplicateRequest}
          handleDuplicateRequestGroup={handleDuplicateRequestGroup}
          handleMoveRequestGroup={handleMoveRequestGroup}
          handleGenerateCode={handleGenerateCode}
          handleCopyAsCurl={handleCopyAsCurl}
          moveDoc={moveDoc}
          workspace={workspace}
          activeRequest={activeRequest}
          filter={filter || ''}
          hotKeyRegistry={hotKeyRegistry}
        />

        {enableSyncBeta &&
          vcs &&
          isLoggedIn() && (
            <SyncDropdown
              className="sidebar__footer"
              workspace={workspace}
              vcs={vcs}
              syncItems={syncItems}
            />
          )}

        {!enableSyncBeta && (
          <SyncLegacyDropdown
            className="sidebar__footer"
            key={workspace._id}
            workspace={workspace}
          />
        )}
      </aside>
    );
  }
}

Sidebar.propTypes = {
  // Functions
  handleActivateRequest: PropTypes.func.isRequired,
  handleSetRequestGroupCollapsed: PropTypes.func.isRequired,
  handleSetRequestPinned: PropTypes.func.isRequired,
  handleSetRequestGroupPinned: PropTypes.func.isRequired,
  handleChangeFilter: PropTypes.func.isRequired,
  handleSetActiveWorkspace: PropTypes.func.isRequired,
  handleSetActiveEnvironment: PropTypes.func.isRequired,
  moveDoc: PropTypes.func.isRequired,
  handleCreateRequest: PropTypes.func.isRequired,
  handleCreateRequestGroup: PropTypes.func.isRequired,
  handleDuplicateRequest: PropTypes.func.isRequired,
  handleDuplicateRequestGroup: PropTypes.func.isRequired,
  handleMoveRequestGroup: PropTypes.func.isRequired,
  handleGenerateCode: PropTypes.func.isRequired,
  handleCopyAsCurl: PropTypes.func.isRequired,
  showEnvironmentsModal: PropTypes.func.isRequired,
  showCookiesModal: PropTypes.func.isRequired,

  // Other
  hidden: PropTypes.bool.isRequired,
  width: PropTypes.number.isRequired,
  isLoading: PropTypes.bool.isRequired,
  workspace: PropTypes.object.isRequired,
  childObjects: PropTypes.arrayOf(PropTypes.object).isRequired,
  workspaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  unseenWorkspaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  environments: PropTypes.arrayOf(PropTypes.object).isRequired,
  environmentHighlightColorStyle: PropTypes.string.isRequired,
  hotKeyRegistry: PropTypes.object.isRequired,
  enableSyncBeta: PropTypes.bool.isRequired,
  syncItems: PropTypes.arrayOf(PropTypes.object).isRequired,

  // Optional
  filter: PropTypes.string,
  activeRequest: PropTypes.object,
  activeEnvironment: PropTypes.object,
  vcs: PropTypes.object,
};

export default Sidebar;
