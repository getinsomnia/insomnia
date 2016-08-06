import React, {Component, PropTypes} from 'react';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'

import KeyValueEditor from './base/KeyValueEditor';

import ContentTypeDropdown from './ContentTypeDropdown';
import RenderedQueryString from './RenderedQueryString';
import RequestBodyEditor from './RequestBodyEditor';
import RequestAuthEditor from './RequestAuthEditor';
import RequestUrlBar from '../components/RequestUrlBar';

import {getContentTypeName} from '../lib/contentTypes';
import {getContentTypeFromHeaders} from '../lib/contentTypes';
import {MOD_SYM} from '../lib/constants';
import {trackEvent} from '../lib/analytics';

class RequestPane extends Component {
  render () {
    const {
      request,
      importFile,
      showPasswords,
      editorFontSize,
      editorLineWrapping,
      sendRequest,
      updateRequestUrl,
      updateRequestMethod,
      updateRequestBody,
      updateRequestParameters,
      updateRequestAuthentication,
      updateRequestHeaders,
      updateRequestContentType,
      updateSettingsShowPasswords
    } = this.props;

    if (!request) {
      return (
        <section className="request-pane pane">
          <header className="pane__header"></header>
          <div className="pane__body pane__body--placeholder">
            <div>
              <table>
                <tbody>
                <tr>
                  <td>New Request</td>
                  <td><code>{MOD_SYM}N</code></td>
                </tr>
                <tr>
                  <td>Open Settings</td>
                  <td><code>{MOD_SYM},</code></td>
                </tr>
                <tr>
                  <td>Switch Requests</td>
                  <td><code>{MOD_SYM}P</code></td>
                </tr>
                </tbody>
              </table>

              <button className="btn btn--super-compact btn--outlined pane__body--placeholder__cta"
                      onClick={e => importFile()}>
                Import from File
              </button>
            </div>
          </div>
        </section>
      )
    }

    return (
      <section className="request-pane pane">
        <header className="pane__header">
          <RequestUrlBar
            key={request._id}
            sendRequest={() => sendRequest(request)}
            onUrlChange={updateRequestUrl}
            onMethodChange={updateRequestMethod}
            url={request.url}
            method={request.method}
          />
        </header>
        <Tabs className="pane__body">
          <TabList>
            <Tab>
              <button onClick={e => trackEvent('Request Tab Clicked', {name: 'Body'})}>
                {getContentTypeName(getContentTypeFromHeaders(request.headers))}
              </button>
              <ContentTypeDropdown updateRequestContentType={updateRequestContentType}/>
            </Tab>
            <Tab>
              <button onClick={e => trackEvent('Request Tab Clicked', {name: 'Auth'})}>
                Auth {request.authentication.username ? <i className="fa fa-lock txt-sm"></i> : ''}
              </button>
            </Tab>
            <Tab>
              <button onClick={e => trackEvent('Request Tab Clicked', {name: 'Params'})}>
                Params {request.parameters.length ?
                <span className="txt-sm">({request.parameters.length})</span> : null}
              </button>
            </Tab>
            <Tab>
              <button onClick={e => trackEvent('Request Tab Clicked', {name: 'Headers'})}>
                Headers {request.headers.length ? (
                <span className="txt-sm">({request.headers.length})</span> ) : null}
              </button>
            </Tab>
          </TabList>
          <TabPanel className="editor-wrapper">
            <RequestBodyEditor
              key={request._id}
              request={request}
              onChange={updateRequestBody}
              fontSize={editorFontSize}
              lineWrapping={editorLineWrapping}
            />
          </TabPanel>
          <TabPanel>
            <RequestAuthEditor
              key={request._id}
              showPasswords={showPasswords}
              request={request}
              onChange={updateRequestAuthentication}
            />
          </TabPanel>
          <TabPanel className="scrollable">
            <div className="pad no-pad-bottom">
              <label className="label--small">Url Preview</label>
              <code className="txt-sm block selectable">
                <RenderedQueryString
                  key={request._id}
                  request={request}
                  placeholder="http://myproduct.com?name=Gregory"
                />
              </code>
            </div>
            <KeyValueEditor
              key={request._id}
              namePlaceholder="name"
              valuePlaceholder="value"
              pairs={request.parameters}
              onChange={updateRequestParameters}
            />
          </TabPanel>
          <TabPanel className="scrollable">
            <KeyValueEditor
              key={request._id}
              namePlaceholder="My-Header"
              valuePlaceholder="Value"
              pairs={request.headers}
              onChange={updateRequestHeaders}
            />
          </TabPanel>
        </Tabs>
      </section>
    )
  }
}

RequestPane.propTypes = {
  // Functions
  sendRequest: PropTypes.func.isRequired,
  updateRequestUrl: PropTypes.func.isRequired,
  updateRequestMethod: PropTypes.func.isRequired,
  updateRequestBody: PropTypes.func.isRequired,
  updateRequestParameters: PropTypes.func.isRequired,
  updateRequestAuthentication: PropTypes.func.isRequired,
  updateRequestHeaders: PropTypes.func.isRequired,
  updateRequestContentType: PropTypes.func.isRequired,
  updateSettingsShowPasswords: PropTypes.func.isRequired,
  importFile: PropTypes.func.isRequired,

  // Other
  showPasswords: PropTypes.bool.isRequired,
  editorFontSize: PropTypes.number.isRequired,
  editorLineWrapping: PropTypes.bool.isRequired,

  // Optional
  request: PropTypes.object,
};

export default RequestPane;
