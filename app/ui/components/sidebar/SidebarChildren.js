import React, {PureComponent, PropTypes} from 'react';
import SidebarRequestRow from './SidebarRequestRow';
import SidebarRequestGroupRow from './SidebarRequestGroupRow';

class SidebarChildren extends PureComponent {
  _renderChildren (children) {
    const {
      handleCreateRequest,
      handleCreateRequestGroup,
      handleSetRequestGroupCollapsed,
      handleDuplicateRequest,
      handleDuplicateRequestGroup,
      handleGenerateCode,
      moveRequest,
      moveRequestGroup,
      handleActivateRequest,
      activeRequest,
      workspace
    } = this.props;

    const activeRequestId = activeRequest ? activeRequest._id : 'n/a';

    return children.map(child => {
      if (child.hidden) {
        return null;
      }

      if (child.doc.type === 'Request') {
        return (
          <SidebarRequestRow
            key={child.doc._id}
            moveRequest={moveRequest}
            handleActivateRequest={handleActivateRequest}
            handleDuplicateRequest={handleDuplicateRequest}
            handleGenerateCode={handleGenerateCode}
            requestCreate={handleCreateRequest}
            isActive={child.doc._id === activeRequestId}
            request={child.doc}
            workspace={workspace}
          />
        );
      }

      // We have a RequestGroup!

      const requestGroup = child.doc;

      function hasActiveChild (children) {
        for (const c of children) {
          if (hasActiveChild(c.children || [])) {
            return true;
          } else if (c.doc._id === activeRequestId) {
            return true;
          }
        }

        // Didn't find anything, so return
        return false;
      }

      const isActive = hasActiveChild(child.children);
      const children = this._renderChildren(child.children);

      return (
        <SidebarRequestGroupRow
          handleActivateRequest={handleActivateRequest}
          key={requestGroup._id}
          isActive={isActive}
          moveRequestGroup={moveRequestGroup}
          moveRequest={moveRequest}
          handleSetRequestGroupCollapsed={handleSetRequestGroupCollapsed}
          handleDuplicateRequestGroup={handleDuplicateRequestGroup}
          isCollapsed={child.collapsed}
          handleCreateRequest={handleCreateRequest}
          handleCreateRequestGroup={handleCreateRequestGroup}
          numChildren={child.children.length}
          workspace={workspace}
          requestGroup={requestGroup}
          children={children}
        />
      );
    });
  }

  render () {
    const {children} = this.props;

    return (
      <ul className="sidebar__list sidebar__list-root">
        {this._renderChildren(children)}
      </ul>
    );
  }
}

SidebarChildren.propTypes = {
  // Required
  handleActivateRequest: PropTypes.func.isRequired,
  handleCreateRequest: PropTypes.func.isRequired,
  handleCreateRequestGroup: PropTypes.func.isRequired,
  handleSetRequestGroupCollapsed: PropTypes.func.isRequired,
  handleDuplicateRequest: PropTypes.func.isRequired,
  handleDuplicateRequestGroup: PropTypes.func.isRequired,
  handleGenerateCode: PropTypes.func.isRequired,
  moveRequest: PropTypes.func.isRequired,
  moveRequestGroup: PropTypes.func.isRequired,
  children: PropTypes.arrayOf(PropTypes.object).isRequired,
  workspace: PropTypes.object.isRequired,

  // Optional
  activeRequest: PropTypes.object
};

export default SidebarChildren;
