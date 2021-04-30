import React, { PureComponent } from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { AUTOBIND_CFG } from '../../../common/constants';
import jq from 'jsonpath';
import RequestSettingsModal from '../modals/request-settings-modal';
import Modal from '../base/modal';
import ModalBody from '../base/modal-body';
import ModalHeader from '../base/modal-header';
import { showModal } from './index';
import Link from '../base/link';
import { docsTemplateTags } from '../../../common/documentation';

interface State {
  error: Error | null;
  request: any;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class RequestRenderErrorModal extends PureComponent<{}, State> {
  state: State = {
    error: null,
  }

  modal: Modal | null = null;

  _setModalRef(n: Modal) {
    this.modal = n;
  }

  _handleShowRequestSettings() {
    this.hide();
    showModal(RequestSettingsModal, {
      request: this.state.request,
    });
  }

  show({ request, error }) {
    this.setState({ request, error });
    this.modal?.show();
  }

  hide() {
    this.modal?.hide();
  }

  renderModalBody(request, error) {
    const fullPath = `Request.${error.path}`;
    const result = jq.query(request, `$.${error.path}`);
    const template = result && result.length ? result[0] : null;
    const locationLabel =
      template && template.includes('\n') ? `line ${error.location.line} of` : null;
    return (
      <div className="pad">
        <div className="notice warning">
          <p>
            Failed to render <strong>{fullPath}</strong> prior to sending
          </p>
          <div className="pad-top-sm">
            {error.path.match(/^body/) && (
              <button
                className="btn btn--clicky margin-right-sm"
                onClick={this._handleShowRequestSettings}>
                Adjust Render Settings
              </button>
            )}
            <Link button href={docsTemplateTags} className="btn btn--clicky">
              Templating Documentation <i className="fa fa-external-link" />
            </Link>
          </div>
        </div>

        <p>
          <strong>Render error</strong>
          <code className="block selectable">{error.message}</code>
        </p>

        <p>
          <strong>Caused by the following field</strong>
          <code className="block">
            {locationLabel} {fullPath}
          </code>
        </p>
      </div>
    );
  }

  render() {
    const { request, error } = this.state;
    return (
      <Modal ref={this._setModalRef} freshState>
        <ModalHeader>Failed to Render Request</ModalHeader>
        <ModalBody>{request && error ? this.renderModalBody(request, error) : null}</ModalBody>
      </Modal>
    );
  }
}

export default RequestRenderErrorModal;
