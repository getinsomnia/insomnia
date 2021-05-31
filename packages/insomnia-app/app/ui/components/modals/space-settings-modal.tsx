import React, { PureComponent } from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { AUTOBIND_CFG } from '../../../common/constants';
import DebouncedInput from '../base/debounced-input';
import Modal from '../base/modal';
import ModalBody from '../base/modal-body';
import ModalHeader from '../base/modal-header';
import PromptButton from '../base/prompt-button';
import * as models from '../../../models/index';
import { Space } from '../../../models/space';
import { strings } from '../../../common/strings';
import { selectActiveSpace } from '../../redux/selectors';
import { bindActionCreators } from 'redux';
import * as spaceActions from '../../redux/modules/space';
import { connect } from 'react-redux';

interface Props {
  space: Space;
  handleRemoveSpace: (space: Space) => void;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class SpaceSettingsModal extends PureComponent<Props> {
  modal: Modal | null = null;

  _handleSetModalRef(n: Modal) {
    this.modal = n;
  }

  _handleRemoveSpace() {
    this.props.handleRemoveSpace(this.props.space);
    this.hide();
  }

  async _handleRename(name: string) {
    const { space } = this.props;
    await models.space.update(space, { name });
  }

  show() {
    this.modal && this.modal.show();
  }

  hide() {
    this.modal && this.modal.hide();
  }

  renderModalHeader() {
    const { space } = this.props;
    return (
      <ModalHeader key={`header::${space._id}`}>
        {strings.space.singular} Settings{' '}
        <div className="txt-sm selectable faint monospace">{space ? space._id : ''}</div>
      </ModalHeader>
    );
  }

  renderModalBody() {
    const { space } = this.props;
    return (
      <ModalBody key={`body::${space._id}`} className="pad">
        <div className="form-control form-control--outlined">
          <label>
            Name
            <DebouncedInput
              // @ts-expect-error -- TSCONVERSION props are spread into an input element
              type="text"
              delay={500}
              placeholder="My Space"
              defaultValue={space.name}
              onChange={this._handleRename}
            />
          </label>
        </div>
        <h2>Actions</h2>
        <div className="form-control form-control--padded">
          <PromptButton
            onClick={this._handleRemoveSpace}
            addIcon
            className="width-auto btn btn--clicky inline-block">
            <i className="fa fa-trash-o" /> Delete
          </PromptButton>
        </div>
      </ModalBody>
    );
  }

  render() {
    const { space } = this.props;
    return (
      <Modal ref={this._handleSetModalRef} freshState>
        {space ? this.renderModalHeader() : null}
        {space ? this.renderModalBody() : null}
      </Modal>
    );
  }
}

const mapStateToProps = (state) => {
  const space = selectActiveSpace(state);
  return {
    space,
  };
};

function mapDispatchToProps(dispatch) {
  const boundSpaceActions = bindActionCreators(spaceActions, dispatch);
  return {
    handleRemoveSpace: boundSpaceActions.removeSpace,
  };
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(SpaceSettingsModal);
