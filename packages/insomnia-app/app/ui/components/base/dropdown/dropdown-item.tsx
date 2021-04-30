import React, { PureComponent } from 'react';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import classnames from 'classnames';
import { AUTOBIND_CFG } from '../../../../common/constants';

interface Props {
  buttonClass?: string,
  stayOpenAfterClick?: boolean,
  value?: any,
  disabled?: boolean,
  onClick: Function,
  children: React.ReactNode,
  className?: string,
  color?: string,
};

@autoBindMethodsForReact(AUTOBIND_CFG)
class DropdownItem extends PureComponent<Props> {
  _handleClick(e) {
    const { stayOpenAfterClick, onClick, disabled } = this.props;

    if (stayOpenAfterClick) {
      e.stopPropagation();
    }

    if (!onClick || disabled) {
      return;
    }

    if (this.props.hasOwnProperty('value')) {
      onClick(this.props.value, e);
    } else {
      onClick(e);
    }
  }

  render() {
    const {
      buttonClass,
      children,
      className,
      color,
      onClick,
      // eslint-disable-line no-unused-vars
      stayOpenAfterClick,
      // eslint-disable-line no-unused-vars
      ...props
    } = this.props;
    const styles = color
      ? {
        color,
      }
      : {};
    const inner = (
      <div className={classnames('dropdown__inner', className)}>
        <div className="dropdown__text" style={styles}>
          {children}
        </div>
      </div>
    );
    const buttonProps = {
      type: 'button',
      onClick: this._handleClick,
      ...props,
    };
    return React.createElement(buttonClass || 'button', buttonProps, inner);
  }
}

export default DropdownItem;
