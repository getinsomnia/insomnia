// @flow
import * as React from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import Tooltip from './tooltip';

type Props = {
  children: React.Node,

  // Optional
  position?: string,
  className?: string,
  style?: Object,
  info?: boolean,
};

@autoBindMethodsForReact
class HelpTooltip extends React.PureComponent<Props> {
  render() {
    const { children, className, style, info } = this.props;
    return (
      <Tooltip position="top" className={className} message={children} style={style}>
        <i className={'fa ' + (info ? 'fa-info-circle' : 'fa-question-circle')} />
      </Tooltip>
    );
  }
}

export default HelpTooltip;
