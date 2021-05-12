import React, { Fragment, PureComponent } from 'react';
import { SvgIcon } from 'insomnia-components';
import GraphQLExplorerTypeLink from './graph-ql-explorer-type-link';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { AUTOBIND_CFG } from '../../../common/constants';
import MarkdownPreview from '../markdown-preview';
import GraphQLExplorerFieldLink from './graph-ql-explorer-field-link';
import type { GraphQLField, GraphQLSchema, GraphQLType } from 'graphql';
import { GraphQLInterfaceType, GraphQLObjectType, GraphQLUnionType } from 'graphql';
import GraphQLDefaultValue from './graph-ql-default-value';
import Tooltip from '../../components/tooltip';

interface Props {
  onNavigateType: (type: Record<string, any>) => void;
  onNavigateField: (field: Record<string, any>) => void;
  type: GraphQLType;
  schema: GraphQLSchema | null;
}

export interface GraphQLFieldWithParentName extends GraphQLField<any, any> {
  parentName?: string;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class GraphQLExplorerType extends PureComponent<Props> {
  _handleNavigateType(type: Record<string, any>) {
    const { onNavigateType } = this.props;
    onNavigateType(type);
  }

  _handleNavigateField(field: Record<string, any>) {
    const { onNavigateField } = this.props;
    onNavigateField(field);
  }

  renderDescription() {
    const { type } = this.props;
    // @ts-expect-error -- TSCONVERSION
    return <MarkdownPreview markdown={type.description || '*no description*'} />;
  }

  renderTypesMaybe() {
    const { schema, type, onNavigateType } = this.props;

    if (schema === null) {
      return null;
    }

    let title = 'Types';
    let types: Array<GraphQLInterfaceType> | Array<GraphQLObjectType> = [];

    if (type instanceof GraphQLUnionType) {
      title = 'Possible Types';
      // @ts-expect-error -- TSCONVERSION
      types = schema.getPossibleTypes(type);
    } else if (type instanceof GraphQLInterfaceType) {
      title = 'Implementations';
      // @ts-expect-error -- TSCONVERSION
      types = schema.getPossibleTypes(type);
    } else if (type instanceof GraphQLObjectType) {
      title = 'Implements';
      types = type.getInterfaces();
    } else {
      return null;
    }

    return (
      <Fragment>
        <h2 className="graphql-explorer__subheading">{title}</h2>
        <ul className="graphql-explorer__defs">
          {types.map(type => (
            <li key={type.name}>
              <GraphQLExplorerTypeLink onNavigate={onNavigateType} type={type} />
            </li>
          ))}
        </ul>
      </Fragment>
    );
  }

  static renderFieldsList(
    fields: Array<GraphQLFieldWithParentName>,
    onNavigateType: (type: Record<string, any>) => void,
    onNavigateField: (field: Record<string, any>) => void,
  ) {
    return (
      <ul className="graphql-explorer__defs">
        {fields.map(field => {
          let argLinks: JSX.Element | null = null;
          const { args } = field;

          if (args && args.length) {
            argLinks = (
              <Fragment>
                (
                {args.map(a => (
                  <div key={a.name} className="graphql-explorer__defs__arg">
                    <span className="info">{a.name}</span>:{' '}
                    <GraphQLExplorerTypeLink onNavigate={onNavigateType} type={a.type} />
                  </div>
                ))}
                )
              </Fragment>
            );
          }

          const fieldLink = (
            <GraphQLExplorerFieldLink
              onNavigate={onNavigateField}
              field={field}
              parentName={field.parentName}
            />
          );
          const typeLink = (
            <GraphQLExplorerTypeLink onNavigate={onNavigateType} type={field.type} />
          );
          const isDeprecated = field.isDeprecated;
          const description = field.description;
          return (
            <li key={field.name + field.parentName}>
              {fieldLink}
              {argLinks}: {typeLink} <GraphQLDefaultValue field={field} />
              {isDeprecated && (
                <Tooltip
                  message={`The field "${field.name}" is deprecated. ${field.deprecationReason}`}
                  position="bottom"
                  delay={1000}
                >
                  <SvgIcon icon="warning" />
                </Tooltip>
              )}
              {description && (
                <div className="graphql-explorer__defs__description">
                  <MarkdownPreview markdown={description} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  renderFieldsMaybe() {
    const { type } = this.props;

    // @ts-expect-error -- TSCONVERSION
    if (typeof type.getFields !== 'function') {
      return null;
    }

    // @ts-expect-error -- TSCONVERSION
    const fields: Array<GraphQLField<any, any>> = type.getFields();
    const sortedFields = Object.values(fields).sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Fragment>
        <h2 className="graphql-explorer__subheading">Fields</h2>
        {GraphQLExplorerType.renderFieldsList(
          sortedFields,
          this._handleNavigateType,
          this._handleNavigateField,
        )}
      </Fragment>
    );
  }

  render() {
    return (
      <div className="graphql-explorer__type">
        {this.renderDescription()}
        {this.renderTypesMaybe()}
        {this.renderFieldsMaybe()}
      </div>
    );
  }
}

export default GraphQLExplorerType;
