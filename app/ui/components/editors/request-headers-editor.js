import React, {PureComponent, PropTypes} from 'react';
import autobind from 'autobind-decorator';
import KeyValueEditor from '../key-value-editor/editor';
import Editor from '../codemirror/code-editor';
import {trackEvent} from '../../../analytics/index';
import allHeaderNames from '../../../datasets/header-names';
import allCharsets from '../../../datasets/charsets';
import allMimeTypes from '../../../datasets/content-types';
import allEncodings from '../../../datasets/encodings';

@autobind
class RequestHeadersEditor extends PureComponent {
  _handleBulkUpdate (headersString) {
    this.props.onChange(this._getHeadersFromString(headersString));
  }

  _handleTrackToggle (pair) {
    trackEvent('Headers Editor', 'Toggle', pair.disabled ? 'Disable' : 'Enable');
  }

  _handleTrackCreate () {
    trackEvent('Headers Editor', 'Create');
  }

  _handleTrackDelete () {
    trackEvent('Headers Editor', 'Delete');
  }

  _getHeadersFromString (headersString) {
    const headers = [];
    const rows = headersString.split(/[\n,]+/);

    for (const row of rows) {
      const items = row.split(':');

      if (items.length !== 2) {
        // Need a colon to be valid
        continue;
      }

      const name = items[0].trim();
      const value = items[1].trim();

      if (!name || !value) {
        // Need name and value to be valid
        continue;
      }

      headers.push({name, value});
    }

    return headers;
  }

  _getHeadersString () {
    const {headers} = this.props;

    let headersString = '';

    for (const header of headers) {
      // Make sure it's not disabled
      if (header.disabled) {
        continue;
      }

      // Make sure it's a valid header (key + value)
      if (!header.name || !header.value) {
        continue;
      }

      headersString += `${header.name}: ${header.value}\n`;
    }

    return headersString;
  }

  _getCommonHeaderValues (pair) {
    switch (pair.name.toLowerCase()) {
      case 'content-type':
      case 'accept':
        return allMimeTypes;
      case 'accept-charset':
        return allCharsets;
      case 'accept-encoding':
        return allEncodings;
      default:
        return [];
    }
  }

  _getCommonHeaderNames (pair) {
    return allHeaderNames;
  }

  render () {
    const {
      bulk,
      headers,
      editorFontSize,
      editorLineWrapping,
      onChange,
      handleRender,
      handleGetRenderContext
    } = this.props;

    return bulk ? (
        <div className="tall">
          <Editor
            getRenderContext={handleGetRenderContext}
            render={handleRender}
            fontSize={editorFontSize}
            lineWrapping={editorLineWrapping}
            onChange={this._handleBulkUpdate}
            defaultValue={this._getHeadersString()}
          />
        </div>
      ) : (
        <div className="pad-bottom scrollable-container">
          <div className="scrollable">
            <KeyValueEditor
              sortable
              namePlaceholder="My-Header"
              valuePlaceholder="Value"
              pairs={headers}
              handleRender={handleRender}
              handleGetRenderContext={handleGetRenderContext}
              handleGetAutocompleteNameConstants={this._getCommonHeaderNames}
              handleGetAutocompleteValueConstants={this._getCommonHeaderValues}
              onToggleDisable={this._handleTrackToggle}
              onCreate={this._handleTrackCreate}
              onDelete={this._handleTrackDelete}
              onChange={onChange}
            />
          </div>
        </div>
      );
  }
}

RequestHeadersEditor.propTypes = {
  onChange: PropTypes.func.isRequired,
  bulk: PropTypes.bool.isRequired,
  editorFontSize: PropTypes.number.isRequired,
  editorLineWrapping: PropTypes.bool.isRequired,
  handleRender: PropTypes.func.isRequired,
  handleGetRenderContext: PropTypes.func.isRequired,
  headers: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired
  })).isRequired
};

export default RequestHeadersEditor;
