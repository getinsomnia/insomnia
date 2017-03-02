import React, {PropTypes, PureComponent} from 'react';
import autoBind from 'react-autobind';
import KeyValueEditor from '../../keyvalueeditor/Editor';
import {trackEvent} from '../../../../analytics/index';

class FormEditor extends PureComponent {
  constructor (props) {
    super(props);
    autoBind(this);
  }

  _handleTrackToggle (pair) {
    trackEvent(
      'Form Editor',
      `Toggle ${pair.type || 'text'}`,
      pair.disabled ? 'Disable' : 'Enable'
    );
  }

  _handleTrackChangeType (type) {
    trackEvent('Form Editor', 'Change Type', type);
  }

  _handleTrackChooseFile () {
    trackEvent('Form Editor', 'Choose File');
  }

  _handleTrackCreate () {
    trackEvent('Form Editor', 'Create');
  }

  _handleTrackDelete () {
    trackEvent('Form Editor', 'Delete');
  }

  render () {
    const {parameters, onChange, handleRender} = this.props;

    return (
      <div className="scrollable-container tall wide">
        <div className="scrollable">
          <KeyValueEditor
            sortable
            namePlaceholder="name"
            valuePlaceholder="value"
            handleRender={handleRender}
            onToggleDisable={this._handleTrackToggle}
            onChangeType={this._handleTrackChangeType}
            onChooseFile={this._handleTrackChooseFile}
            onCreate={this._handleTrackCreate}
            onDelete={this._handleTrackDelete}
            onChange={onChange}
            pairs={parameters}
            multipart
          />
        </div>
      </div>
    )
  }
}

FormEditor.propTypes = {
  // Required
  onChange: PropTypes.func.isRequired,
  parameters: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleRender: PropTypes.func.isRequired,
};

export default FormEditor;
