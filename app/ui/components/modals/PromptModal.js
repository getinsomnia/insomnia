import React, {PureComponent} from 'react';
import autobind from 'autobind-decorator';
import Button from '../base/Button';
import Modal from '../base/Modal';
import ModalBody from '../base/ModalBody';
import ModalHeader from '../base/ModalHeader';
import ModalFooter from '../base/ModalFooter';

@autobind
class PromptModal extends PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      headerName: 'Not Set',
      defaultValue: '',
      submitName: 'Not Set',
      selectText: false,
      hint: null,
      inputType: 'text',
      hints: []
    };
  }

  _done (hint) {
    this._onSubmitCallback && this._onSubmitCallback(hint);
    this.modal.hide();
  }

  _setInputRef (n) {
    this._input = n;
  }

  _setModalRef (n) {
    this.modal = n;
  }

  _handleSelectHint (hint) {
    this._done(hint);
  }

  _handleSubmit (e) {
    e.preventDefault();

    this._done(this._input.value);
  }

  show (options) {
    const {
      headerName,
      defaultValue,
      submitName,
      selectText,
      hint,
      inputType,
      placeholder,
      label,
      hints
    } = options;

    this.modal.show();

    // Need to do this after render because modal focuses itself too
    setTimeout(() => {
      this._input.value = defaultValue || '';
      this._input.focus();
      selectText && this._input.select();
    }, 100);

    return new Promise(resolve => {
      this._onSubmitCallback = resolve;

      this.setState({
        headerName,
        defaultValue,
        submitName,
        selectText,
        placeholder,
        hint,
        inputType,
        label,
        hints
      });
    });
  }

  _renderHintButton (hint) {
    return (
      <Button type="button"
              value={hint}
              key={hint}
              className="btn btn--outlined btn--super-duper-compact margin-right-sm"
              onClick={this._handleSelectHint}>
        {hint}
      </Button>
    );
  }

  render () {
    const {extraProps} = this.props;
    const {
      submitName,
      headerName,
      hint,
      inputType,
      placeholder,
      label,
      hints
    } = this.state;

    const input = (
      <input
        ref={this._setInputRef}
        id="prompt-input"
        type={inputType === 'decimal' ? 'number' : (inputType || 'text')}
        step={inputType === 'decimal' ? '0.1' : null}
        min={inputType === 'decimal' ? '0.5' : null}
        placeholder={placeholder || ''}
      />
    );

    return (
      <Modal ref={this._setModalRef} {...extraProps}>
        <ModalHeader>{headerName}</ModalHeader>
        <ModalBody className="wide">
          <form onSubmit={this._handleSubmit} className="wide pad">
            <div className="form-control form-control--outlined form-control--wide">
              {label ? <label>{label}{input}</label> : input}
            </div>
            {hints.map(this._renderHintButton)}
          </form>
        </ModalBody>
        <ModalFooter>
          <div className="margin-left faint italic txt-sm tall">{hint ? `* ${hint}` : ''}</div>
          <button className="btn" onClick={this._handleSubmit}>
            {submitName || 'Submit'}
          </button>
        </ModalFooter>
      </Modal>
    );
  }
}

PromptModal.propTypes = {};

export default PromptModal;
