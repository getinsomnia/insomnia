// @flow

import * as React from 'react';

declare module 'react-switch' {
  declare module.exports: {
    Switch: React.Component<*>,
  };
}
