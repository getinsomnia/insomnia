// @flow
import * as React from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { AUTOBIND_CFG } from '../../../common/constants';
import Modal from '../base/modal';
import ModalBody from '../base/modal-body';
import ModalHeader from '../base/modal-header';
import HelpTooltip from '../help-tooltip';
import * as models from '../../../models';
import DebouncedInput from '../base/debounced-input';
import MarkdownEditor from '../markdown-editor';
import * as db from '../../../common/database';
import type { Workspace } from '../../../models/workspace';
import type { RequestGroup } from '../../../models/request-group';

type Props = {
  editorFontSize: number,
  editorIndentSize: number,
  editorKeyMap: string,
  editorLineWrapping: boolean,
  nunjucksPowerUserMode: boolean,
  isVariableUncovered: boolean,
  handleRender: Function,
  handleGetRenderContext: Function,
  workspaces: Array<Workspace>,
};

type State = {
  requestGroupGroup: RequestGroup | null,
  showDescription: boolean,
  defaultPreviewMode: boolean,
  activeWorkspaceIdToCopyTo: string | null,
  workspace: Workspace | null,
  justCopied: boolean,
  justMoved: boolean,
};

type RequestGroupSettingsModalOptions = {
  requestGroup: RequestGroup,
  forceEditMode: boolean,
};

@autoBindMethodsForReact(AUTOBIND_CFG)
class RequestGroupSettingsModal extends React.PureComponent<Props, State> {
  modal: ?Modal;
  _editor: ?MarkdownEditor;

  constructor(props: Props) {
    super(props);
    this.state = {
      requestGroup: null,
      showDescription: false,
      defaultPreviewMode: false,
      activeWorkspaceIdToCopyTo: null,
      workspace: null,
      workspaces: [],
      justCopied: false,
      justMoved: false,
    };
  }

  _setModalRef(n: ?Modal) {
    this.modal = n;
  }

  _setEditorRef(n: ?MarkdownEditor) {
    this._editor = n;
  }

  async _handleNameChange(name: string) {
    const { requestGroup: originalRequestGroup } = this.state;

    if (!originalRequestGroup) {
      return;
    }
    const patch = { name };

    const updatedRequestGroup = models.requestGroup.update(originalRequestGroup, patch);
    this.setState({ requestGroup: updatedRequestGroup });
  }

  async _handleDescriptionChange(description: string) {
    if (!this.state.requestGroup) {
      return;
    }
    const requestGroup = await models.requestGroup.update(this.state.requestGroup, {
      description,
    });
    this.setState({ requestGroup, defaultPreviewMode: false });
  }

  _handleAddDescription() {
    this.setState({ showDescription: true });
  }

  _handleUpdateMoveCopyWorkspace(e: SyntheticEvent<HTMLSelectElement>) {
    const { value } = e.currentTarget;
    const workspaceId = value === '__NULL__' ? null : value;
    this.setState({ activeWorkspaceIdToCopyTo: workspaceId });
  }

  async _handleMoveToWorkspace() {
    const { activeWorkspaceIdToCopyTo, requestGroup } = this.state;
    if (!requestGroup || !activeWorkspaceIdToCopyTo) {
      return;
    }

    const workspace = await models.workspace.getById(activeWorkspaceIdToCopyTo);
    if (!workspace) {
      return;
    }

    const patch = {
      metaSortKey: -1e9, // Move to top of sort order
      parentId: activeWorkspaceIdToCopyTo,
    };

    await models.requestGroup.update(requestGroup, patch);

    this.setState({ justMoved: true });
    setTimeout(() => {
      this.setState({ justMoved: false });
    }, 2000);
  }

  async _handleCopyToWorkspace() {
    const { activeWorkspaceIdToCopyTo, requestGroup } = this.state;
    if (!requestGroup || !activeWorkspaceIdToCopyTo) {
      return;
    }

    const workspace = await models.workspace.getById(activeWorkspaceIdToCopyTo);
    if (!workspace) {
      return;
    }

    const patch = {
      metaSortKey: -1e9, // Move to top of sort order
      name: requestGroup.name, // Because duplicate will add (Copy) suffix if name is not provided in patch
      parentId: activeWorkspaceIdToCopyTo,
    };

    await models.requestGroup.duplicate(requestGroup, patch);

    this.setState({ justCopied: true });
    setTimeout(() => {
      this.setState({ justCopied: false });
    }, 2000);

    models.stats.incrementCreatedRequests();
  }

  async show({ requestGroup, forceEditMode }: RequestGroupSettingsModalOptions) {
    const { workspaces } = this.props;

    const hasDescription = !!requestGroup.description;

    // Find workspaces for use with moving workspace
    const ancestors = await db.withAncestors(requestGroup);
    const doc = ancestors.find(doc => doc.type === models.workspace.type);
    const workspaceId = doc ? doc._id : 'should-never-happen';
    const workspace = workspaces.find(w => w._id === workspaceId);

    this.setState(
      {
        requestGroup,
        workspace: workspace,
        activeWorkspaceIdToCopyTo: null,
        showDescription: forceEditMode || hasDescription,
        defaultPreviewMode: hasDescription && !forceEditMode,
      },
      () => {
        this.modal && this.modal.show();

        if (forceEditMode) {
          setTimeout(() => {
            this._editor && this._editor.focus();
          }, 400);
        }
      },
    );
  }

  hide() {
    this.modal && this.modal.hide();
  }

  _renderDescription(): React.Node {
    const {
      editorLineWrapping,
      editorFontSize,
      editorIndentSize,
      editorKeyMap,
      handleRender,
      handleGetRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
    } = this.props;

    const { showDescription, defaultPreviewMode, requestGroup } = this.state;

    if (!requestGroup) {
      return null;
    }

    return showDescription ? (
      <MarkdownEditor
        ref={this._setEditorRef}
        className="margin-top"
        defaultPreviewMode={defaultPreviewMode}
        fontSize={editorFontSize}
        indentSize={editorIndentSize}
        keyMap={editorKeyMap}
        placeholder="Write a description"
        lineWrapping={editorLineWrapping}
        handleRender={handleRender}
        handleGetRenderContext={handleGetRenderContext}
        nunjucksPowerUserMode={nunjucksPowerUserMode}
        isVariableUncovered={isVariableUncovered}
        defaultValue={requestGroup.description}
        onChange={this._handleDescriptionChange}
      />
    ) : (
      <button
        onClick={this._handleAddDescription}
        className="btn btn--outlined btn--super-duper-compact">
        Add Description
      </button>
    );
  }

  _renderMoveCopy(): React.Node {
    const { workspaces } = this.props;

    const {
      activeWorkspaceIdToCopyTo,
      justMoved,
      justCopied,
      workspace,
      requestGroup,
    } = this.state;

    if (!requestGroup) {
      return null;
    }

    return (
      <div className="form-row">
        <div className="form-control form-control--outlined">
          <label>
            Move/Copy to Workspace
            <HelpTooltip position="top" className="space-left">
              Copy or move the current folder to a new workspace. It will be placed at the root of
              the new workspace's folder structure.
            </HelpTooltip>
            <select
              value={activeWorkspaceIdToCopyTo || '__NULL__'}
              onChange={this._handleUpdateMoveCopyWorkspace}>
              <option value="__NULL__">-- Select Workspace --</option>
              {workspaces.map(w => {
                if (workspace && workspace._id === w._id) {
                  return null;
                }

                return (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <div className="form-control form-control--no-label width-auto">
          <button
            disabled={justCopied || !activeWorkspaceIdToCopyTo}
            className="btn btn--clicky"
            onClick={this._handleCopyToWorkspace}>
            {justCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="form-control form-control--no-label width-auto">
          <button
            disabled={justMoved || !activeWorkspaceIdToCopyTo}
            className="btn btn--clicky"
            onClick={this._handleMoveToWorkspace}>
            {justMoved ? 'Moved!' : 'Move'}
          </button>
        </div>
      </div>
    );
  }

  renderModalBody(): React.Node {
    const { requestGroup } = this.state;

    if (!requestGroup) {
      return null;
    }

    return (
      <div>
        <div className="form-control form-control--outlined">
          <label>
            Name
            <DebouncedInput
              delay={500}
              type="text"
              placeholder={requestGroup.url || 'My Folder'}
              defaultValue={requestGroup.name}
              onChange={this._handleNameChange}
            />
          </label>
        </div>
        {this._renderDescription()}
        {this._renderMoveCopy()}
      </div>
    );
  }

  render() {
    const { requestGroup } = this.state;
    return (
      <Modal ref={this._setModalRef} freshState>
        <ModalHeader>
          Folder Settings{' '}
          <span className="txt-sm selectable faint monospace">
            {requestGroup ? requestGroup._id : ''}
          </span>
        </ModalHeader>
        <ModalBody className="pad">{this.renderModalBody()}</ModalBody>
      </Modal>
    );
  }
}

export default RequestGroupSettingsModal;
