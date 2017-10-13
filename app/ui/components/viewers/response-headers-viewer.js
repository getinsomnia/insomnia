import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import CopyButton from '../base/copy-button';

class ResponseHeadersViewer extends PureComponent {
  render () {
    const {headers} = this.props;

    const headersString = headers.map(
      h => `${h.name}: ${h.value}`
    ).join('\n');

    return [
      <table key='table' className="table--fancy table--striped">
        <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
        </tr>
        </thead>
        <tbody>
        {headers.map((h, i) => (
          <tr className="selectable" key={i}>
            <td style={{width: '50%'}} className="force-wrap">{h.name}</td>
            <td style={{width: '50%'}} className="force-wrap">{h.value}</td>
          </tr>
        ))}
        </tbody>
      </table>,
      <p key='copy' className="pad-top">
        <CopyButton
          className="pull-right btn btn--clicky"
          content={headersString}
        />
      </p>
    ];
  }
}

ResponseHeadersViewer.propTypes = {
  headers: PropTypes.array.isRequired
};

export default ResponseHeadersViewer;
