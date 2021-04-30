import React, { HTMLAttributes, PureComponent, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode,
  noWrap?: boolean,
  className?: string,
}

class DropdownButton extends PureComponent<Props> {
  render() {
    const { children, noWrap, ...props } = this.props;

    if (noWrap) {
      return <>{children}</>;
    }

    return (
      <button type="button" {...props}>
        {children}
      </button>
    );
  }
}

export default DropdownButton;
