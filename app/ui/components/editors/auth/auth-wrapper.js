import React, {PropTypes, PureComponent} from 'react';
import {AUTH_BASIC, AUTH_DIGEST, AUTH_OAUTH_1, AUTH_OAUTH_2} from '../../../../common/constants';
import BasicAuth from './basic-auth';
import OAuth2 from './o-auth-2';
import autobind from 'autobind-decorator';

@autobind
class AuthWrapper extends PureComponent {
  renderEditor () {
    const {
      request,
      handleRender,
      handleGetRenderContext,
      handleUpdateSettingsShowPasswords,
      onChange,
      showPasswords
    } = this.props;

    const {authentication} = request;

    if (authentication.type === AUTH_BASIC) {
      return (
        <BasicAuth
          authentication={authentication}
          handleRender={handleRender}
          handleGetRenderContext={handleGetRenderContext}
          handleUpdateSettingsShowPasswords={handleUpdateSettingsShowPasswords}
          onChange={onChange}
          showPasswords={showPasswords}
        />
      );
    } else if (authentication.type === AUTH_OAUTH_2) {
      return (
        <OAuth2
          request={request}
          handleRender={handleRender}
          handleGetRenderContext={handleGetRenderContext}
          handleUpdateSettingsShowPasswords={handleUpdateSettingsShowPasswords}
          onChange={onChange}
          showPasswords={showPasswords}
        />
      );
    } else if (authentication.type === AUTH_OAUTH_1) {
      return (
        <div className="vertically-center text-center">
          <p className="pad super-faint text-sm text-center">
            <i className="fa fa-commenting" style={{fontSize: '8rem', opacity: 0.3}}/>
            <br/><br/>
            Don't worry, OAuth 1.0 is coming soon!
          </p>
        </div>
      );
    } else if (authentication.type === AUTH_DIGEST) {
      return (
        <div className="vertically-center text-center">
          <p className="pad super-faint text-sm text-center">
            <i className="fa fa-commenting" style={{fontSize: '8rem', opacity: 0.3}}/>
            <br/><br/>
            Don't worry, digest auth is coming soon!
          </p>
        </div>
      );
    } else {
      return (
        <div className="vertically-center text-center">
          <p className="pad super-faint text-sm text-center">
            <i className="fa fa-unlock-alt" style={{fontSize: '8rem', opacity: 0.3}}/>
            <br/><br/>
            Select an auth type from above
          </p>
        </div>
      );
    }
  }

  render () {
    return (
      <div className="pad tall">{this.renderEditor()}</div>
    );
  }
}

AuthWrapper.propTypes = {
  handleRender: PropTypes.func.isRequired,
  handleGetRenderContext: PropTypes.func.isRequired,
  handleUpdateSettingsShowPasswords: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  request: PropTypes.object.isRequired,
  showPasswords: PropTypes.bool.isRequired
};

export default AuthWrapper;
