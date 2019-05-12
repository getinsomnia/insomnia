// @flow
import * as React from 'react';
import autobind from 'autobind-decorator';
import CodeEditor from '../codemirror/code-editor';
import orderedJSON from 'json-order';
import HelpTooltip from '../help-tooltip';

export type EnvironmentInfo = {
  object: Object,
  propertyMap: Object | null,
};

type Props = {
  environmentInfo: EnvironmentInfo,
  didChange: Function,
  editorFontSize: number,
  editorIndentSize: number,
  editorKeyMap: string,
  render: Function,
  getRenderContext: Function,
  nunjucksPowerUserMode: boolean,
  isVariableUncovered: boolean,
  lineWrapping: boolean,
};

type State = {
  error: string | null,
  warning: string | null,
  maintainOrder: boolean,
};

@autobind
class EnvironmentEditor extends React.PureComponent<Props, State> {
  _editor: CodeEditor | null;

  constructor(props: Props) {
    super(props);
    this.state = {
      error: null,
      warning: null,
      maintainOrder: props.environmentInfo.propertyMap || false,
    };
  }

  _handleChange() {
    let error = null;
    let warning = null;
    let value = null;

    // Check for JSON parse errors
    try {
      value = this.getValue();
    } catch (err) {
      error = err.message;
    }

    // Check for invalid key names
    if (value) {
      for (const key of Object.keys(value)) {
        if (!key.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/)) {
          warning = `"${key}" must only contain letters, numbers, and underscores`;
          break;
        }
      }
    }

    // Call this last in case component unmounted
    if (this.state.error !== error || this.state.warning !== warning) {
      this.setState({ error, warning }, () => {
        this.props.didChange();
      });
    } else {
      this.props.didChange();
    }
  }

  _setEditorRef(n: ?CodeEditor) {
    this._editor = n;
  }

  _updateMaintainOrderBoolean(checked: boolean) {
    this.setState({ maintainOrder: !this.state.maintainOrder }, () => {
      this.props.didChange();
    });
  }

  getValue(): EnvironmentInfo | null {
    if (this._editor) {
      if (this.state.maintainOrder) {
        const data = orderedJSON.parse(this._editor.getValue(), '&', `~|`);

        return {
          object: data.object,
          propertyMap: data.map || null,
        };
      } else {
        return {
          object: JSON.parse(this._editor.getValue()),
          propertyMap: null,
        };
      }
    } else {
      return null;
    }
  }

  isValid() {
    return !this.state.error;
  }

  render() {
    const {
      environmentInfo,
      editorFontSize,
      editorIndentSize,
      editorKeyMap,
      render,
      getRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
      lineWrapping,
      ...props
    } = this.props;

    const { error, warning, maintainOrder } = this.state;

    return (
      <div className="environment-editor">
        <CodeEditor
          ref={this._setEditorRef}
          autoPrettify
          fontSize={editorFontSize}
          indentSize={editorIndentSize}
          lineWrapping={lineWrapping}
          keyMap={editorKeyMap}
          onChange={this._handleChange}
          defaultValue={orderedJSON.stringify(
            environmentInfo.object,
            (maintainOrder && environmentInfo.propertyMap) || null,
          )}
          nunjucksPowerUserMode={nunjucksPowerUserMode}
          isVariableUncovered={isVariableUncovered}
          render={render}
          getRenderContext={getRenderContext}
          mode="application/json"
          {...props}
        />
        {error && <p className="notice error margin-x margin-y-sm">{error}</p>}
        {!error && warning && <p className="notice warning margin-x margin-y-sm">{warning}</p>}
        <div className="form-control margin-x margin-y-sm">
          <label>
            Keep property order
            <input
              type="checkbox"
              checked={maintainOrder}
              onChange={this._updateMaintainOrderBoolean}
            />
            <HelpTooltip position="top" className="space-left">
              If disabled, properties will automatically be switched to alphabetical order.
            </HelpTooltip>
          </label>
        </div>
      </div>
    );
  }
}

export default EnvironmentEditor;
