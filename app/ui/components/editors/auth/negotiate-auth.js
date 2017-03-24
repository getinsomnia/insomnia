import React, {PropTypes, PureComponent} from 'react';
import autobind from 'autobind-decorator';
import KeyValueEditor from '../../key-value-editor/editor';
import {trackEvent} from '../../../../analytics/index';
import {AUTH_NEGOTIATE} from '../../../../common/constants';

@autobind
class NegotiateAuth extends PureComponent {
  _handleOnCreate () {
    trackEvent('Negotiate Auth Editor', 'Create');
  }

  _handleOnDelete () {
    trackEvent('Negotiate Auth Editor', 'Delete');
  }

  _handleToggleDisable (pair) {
    const label = pair.disabled ? 'Disable' : 'Enable';
    trackEvent('Negotiate Auth Editor', 'Toggle', label);
  }

  _handleChange (pairs) {
    const pair = {
      type: AUTH_NEGOTIATE,
      username: pairs.length ? pairs[0].name : '',
      password: pairs.length ? pairs[0].value : '',
      disabled: pairs.length ? pairs[0].disabled : false
    };

    this.props.onChange(pair);
  }

  render () {
    const {
      authentication,
      showPasswords,
      handleRender,
      handleGetRenderContext
    } = this.props;

    const pairs = [{
      name: authentication.username || '',
      value: authentication.password || '',
      disabled: authentication.disabled || false
    }];

    return (
      <KeyValueEditor
        pairs={pairs}
        maxPairs={1}
        disableDelete
        handleRender={handleRender}
        handleGetRenderContext={handleGetRenderContext}
        namePlaceholder="Username"
        valuePlaceholder="•••••••••••"
        valueInputType={showPasswords ? 'text' : 'password'}
        onToggleDisable={this._handleToggleDisable}
        onCreate={this._handleOnCreate}
        onDelete={this._handleOnDelete}
        onChange={this._handleChange}
      />
    );
  }
}

NegotiateAuth.propTypes = {
  handleRender: PropTypes.func.isRequired,
  handleGetRenderContext: PropTypes.func.isRequired,
  handleUpdateSettingsShowPasswords: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  authentication: PropTypes.object.isRequired,
  showPasswords: PropTypes.bool.isRequired
};

export default NegotiateAuth;
