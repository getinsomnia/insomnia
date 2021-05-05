import React, { PureComponent, ReactNode } from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import type { WrapperProps } from './wrapper';
import classnames from 'classnames';
import ErrorBoundary from './error-boundary';
import Sidebar from './sidebar/sidebar';
import { AUTOBIND_CFG } from '../../common/constants';

interface Props {
  wrapperProps: WrapperProps;
  renderPageSidebar?: () => ReactNode;
  renderPageHeader?: () => ReactNode;
  renderPageBody?: () => ReactNode;
  renderPaneOne?: () => ReactNode;
  renderPaneTwo?: () => ReactNode;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class PageLayout extends PureComponent<Props> {
  // Special request updaters
  _handleStartDragSidebar(e: Event) {
    e.preventDefault();
    const { handleStartDragSidebar } = this.props.wrapperProps;
    handleStartDragSidebar();
  }

  render() {
    const {
      renderPaneOne,
      renderPaneTwo,
      renderPageBody,
      renderPageHeader,
      renderPageSidebar,
      wrapperProps,
    } = this.props;
    const {
      activeEnvironment,
      activeGitRepository,
      gitVCS,
      handleInitializeEntities,
      handleResetDragSidebar,
      handleSetActiveEnvironment,
      handleSetActiveWorkspace,
      handleSetSidebarRef,
      handleSetRequestPaneRef,
      handleSetResponsePaneRef,
      handleStartDragPaneHorizontal,
      handleResetDragPaneHorizontal,
      handleStartDragPaneVertical,
      handleResetDragPaneVertical,
      isLoading,
      paneHeight,
      paneWidth,
      settings,
      sidebarHidden,
      sidebarWidth,
      unseenWorkspaces,
      workspaces,
    } = wrapperProps;
    const realSidebarWidth = sidebarHidden ? 0 : sidebarWidth;
    const paneTwo = renderPaneTwo && renderPaneTwo();
    const gridRows = paneTwo
      ? `auto minmax(0, ${paneHeight}fr) 0 minmax(0, ${1 - paneHeight}fr)`
      : 'auto 1fr';
    const gridColumns =
      `auto ${realSidebarWidth}rem 0 ` +
      `${paneTwo ? `minmax(0, ${paneWidth}fr) 0 minmax(0, ${1 - paneWidth}fr)` : '1fr'}`;
    return (
      <div
        key="wrapper"
        id="wrapper"
        className={classnames('wrapper', {
          'wrapper--vertical': settings.forceVerticalLayout,
        })}
        style={{
          gridTemplateColumns: gridColumns,
          gridTemplateRows: gridRows,
          boxSizing: 'border-box',
          borderTop:
            activeEnvironment &&
            activeEnvironment.color &&
            settings.environmentHighlightColorStyle === 'window-top'
              ? '5px solid ' + activeEnvironment.color
              : null,
          borderBottom:
            activeEnvironment &&
            activeEnvironment.color &&
            settings.environmentHighlightColorStyle === 'window-bottom'
              ? '5px solid ' + activeEnvironment.color
              : null,
          borderLeft:
            activeEnvironment &&
            activeEnvironment.color &&
            settings.environmentHighlightColorStyle === 'window-left'
              ? '5px solid ' + activeEnvironment.color
              : null,
          borderRight:
            activeEnvironment &&
            activeEnvironment.color &&
            settings.environmentHighlightColorStyle === 'window-right'
              ? '5px solid ' + activeEnvironment.color
              : null,
        }}>
        {renderPageHeader && <ErrorBoundary showAlert>{renderPageHeader()}</ErrorBoundary>}

        {renderPageSidebar && (
          <ErrorBoundary showAlert>
            <Sidebar
              ref={handleSetSidebarRef}
              activeEnvironment={activeEnvironment}
              activeGitRepository={activeGitRepository}
              environmentHighlightColorStyle={settings.environmentHighlightColorStyle}
              handleInitializeEntities={handleInitializeEntities}
              handleSetActiveEnvironment={handleSetActiveEnvironment}
              handleSetActiveWorkspace={handleSetActiveWorkspace}
              hidden={sidebarHidden || false}
              hotKeyRegistry={settings.hotKeyRegistry}
              isLoading={isLoading}
              showEnvironmentsModal={this._handleShowEnvironmentsModal}
              unseenWorkspaces={unseenWorkspaces}
              gitVCS={gitVCS}
              width={sidebarWidth}
              workspaces={workspaces}>
              {renderPageSidebar()}
            </Sidebar>

            <div className="drag drag--sidebar">
              <div
                onDoubleClick={handleResetDragSidebar}
                onMouseDown={this._handleStartDragSidebar}
              />
            </div>
          </ErrorBoundary>
        )}
        {renderPageBody ? (
          <ErrorBoundary showAlert>{renderPageBody()}</ErrorBoundary>
        ) : (
          <>
            {renderPaneOne && (
              <ErrorBoundary showAlert>
                <Pane position="one" ref={handleSetRequestPaneRef}>
                  {renderPaneOne()}
                </Pane>
              </ErrorBoundary>
            )}
            {paneTwo && (
              <>
                <div className="drag drag--pane-horizontal">
                  <div
                    onMouseDown={handleStartDragPaneHorizontal}
                    onDoubleClick={handleResetDragPaneHorizontal}
                  />
                </div>

                <div className="drag drag--pane-vertical">
                  <div
                    onMouseDown={handleStartDragPaneVertical}
                    onDoubleClick={handleResetDragPaneVertical}
                  />
                </div>

                <ErrorBoundary showAlert>
                  <Pane position="two" ref={handleSetResponsePaneRef}>
                    {paneTwo}
                  </Pane>
                </ErrorBoundary>
              </>
            )}
          </>
        )}
      </div>
    );
  }
}

export default PageLayout;

class Pane extends PureComponent {
  render() {
    return (
      <section className={`pane-${this.props.position} theme--pane`}>{this.props.children}</section>
    );
  }
}