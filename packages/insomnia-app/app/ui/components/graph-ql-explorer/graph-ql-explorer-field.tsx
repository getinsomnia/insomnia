import React, { Fragment, PureComponent } from 'react';
import type { GraphQLField, GraphQLType } from 'graphql';
import GraphQLExplorerTypeLink from './graph-ql-explorer-type-link';
import MarkdownPreview from '../markdown-preview';
import GraphQLDefaultValue from './graph-ql-default-value';

interface Props {
  onNavigateType: (type: GraphQLType) => void;
  field: GraphQLField<any, any>;
}

class GraphQLExplorerField extends PureComponent<Props> {
  renderDescription() {
    const { field } = this.props;
    return <MarkdownPreview markdown={field.description || '*no description*'} />;
  }

  renderType() {
    const { field, onNavigateType } = this.props;
    return (
      <Fragment>
        <h2 className="graphql-explorer__subheading">Type</h2>
        <GraphQLExplorerTypeLink type={field.type} onNavigate={onNavigateType} />
      </Fragment>
    );
  }

  renderArgumentsMaybe() {
    const { field, onNavigateType } = this.props;

    if (!field.args || field.args.length === 0) {
      return null;
    }

    return (
      <Fragment>
        <h2 className="graphql-explorer__subheading">Arguments</h2>
        <ul className="graphql-explorer__defs">
          {field.args.map(a => {
            return (
              <li key={a.name}>
                <span className="info">{a.name}</span>:{' '}
                <GraphQLExplorerTypeLink onNavigate={onNavigateType} type={a.type} />
                <GraphQLDefaultValue field={a as Record<string, any>} />
                {a.description && <MarkdownPreview markdown={a.description} />}
              </li>
            );
          })}
        </ul>
      </Fragment>
    );
  }

  render() {
    return (
      <div className="graphql-explorer__field">
        {this.renderDescription()}
        {this.renderType()}
        {this.renderArgumentsMaybe()}
      </div>
    );
  }
}

export default GraphQLExplorerField;
