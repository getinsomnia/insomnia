import * as networkUtils from '../network';
import fs from 'fs';
import {join as pathJoin, resolve as pathResolve} from 'path';
import {getRenderedRequest} from '../../common/render';
import * as models from '../../models';
import {AUTH_AWS_IAM, AUTH_BASIC, AUTH_NETRC, CONTENT_TYPE_FILE, CONTENT_TYPE_FORM_DATA, CONTENT_TYPE_FORM_URLENCODED, getAppVersion} from '../../common/constants';
import {filterHeaders} from '../../common/misc';
import {globalBeforeEach} from '../../__jest__/before-each';
import {DEFAULT_BOUNDARY} from '../multipart';

describe('actuallySend()', () => {
  beforeEach(globalBeforeEach);
  it('sends a generic request', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();
    const cookies = [{
      creation: new Date('2016-10-05T04:40:49.505Z'),
      key: 'foo',
      value: 'barrrrr',
      expires: new Date('2096-10-12T04:40:49.000Z'),
      domain: 'notlocalhost',
      path: '/',
      hostOnly: true,
      lastAccessed: new Date('2096-10-05T04:40:49.505Z')
    }, {
      creation: new Date('2016-10-05T04:40:49.505Z'),
      key: 'foo',
      value: 'bar',
      expires: new Date('2096-10-12T04:40:49.000Z'),
      domain: 'localhost',
      path: '/',
      hostOnly: true,
      lastAccessed: new Date('2096-10-05T04:40:49.505Z')
    }];

    const cookieJar = await models.cookieJar.getOrCreateForParentId(workspace._id);
    await models.cookieJar.update(cookieJar, {
      parentId: workspace._id,
      cookies
    });

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      headers: [{name: 'Content-Type', value: 'application/json'}],
      parameters: [{name: 'foo bar', value: 'hello&world'}],
      method: 'POST',
      body: {
        mimeType: CONTENT_TYPE_FORM_URLENCODED,
        params: [{name: 'foo', value: 'bar'}]
      },
      url: 'http://localhost',
      authentication: {
        type: AUTH_BASIC,
        username: 'user',
        password: 'pass'
      }
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(
      renderedRequest,
      workspace,
      settings
    );

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        COOKIELIST: [
          'notlocalhost\tFALSE\t/\tFALSE\t4000855249\tfoo\tbarrrrr',
          'localhost\tFALSE\t/\tFALSE\t4000855249\tfoo\tbar'
        ],
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Content-Type: application/json',
          'Expect: ',
          'Transfer-Encoding: ',
          'Accept: */*',
          'Accept-Encoding: '
        ],
        NOPROGRESS: false,
        USERNAME: 'user',
        PASSWORD: 'pass',
        POSTFIELDS: 'foo=bar',
        POST: 1,
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://localhost/?foo%20bar=hello%26world',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('sends a urlencoded', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();
    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      headers: [{name: 'Content-Type', value: CONTENT_TYPE_FORM_URLENCODED}],
      method: 'POST',
      body: {
        mimeType: CONTENT_TYPE_FORM_URLENCODED,
        params: [
          {name: 'foo', value: 'bar'},
          {name: 'bar', value: ''},
          {name: '', value: 'value'}
        ]
      },
      url: 'http://localhost'
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(
      renderedRequest,
      workspace,
      settings
    );

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        POST: 1,
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Content-Type: application/x-www-form-urlencoded',
          'Expect: ',
          'Transfer-Encoding: ',
          'Accept: */*',
          'Accept-Encoding: '
        ],
        NOPROGRESS: false,
        POSTFIELDS: 'foo=bar&bar=&=value',
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://localhost/',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('skips sending and storing cookies with setting', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();
    const cookies = [{
      creation: new Date('2016-10-05T04:40:49.505Z'),
      key: 'foo',
      value: 'barrrrr',
      expires: new Date('2096-10-12T04:40:49.000Z'),
      domain: 'notlocalhost',
      path: '/',
      hostOnly: true,
      lastAccessed: new Date('2096-10-05T04:40:49.505Z')
    }, {
      creation: new Date('2016-10-05T04:40:49.505Z'),
      key: 'foo',
      value: 'barrrrr',
      expires: new Date('2096-10-12T04:40:49.000Z'),
      domain: 'localhost',
      path: '/',
      hostOnly: true,
      lastAccessed: new Date('2096-10-05T04:40:49.505Z')
    }];

    await models.cookieJar.create({
      parentId: workspace._id,
      cookies
    });

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      headers: [{name: 'Content-Type', value: 'application/json'}],
      parameters: [{name: 'foo bar', value: 'hello&world'}],
      method: 'GET',
      body: {
        mimeType: CONTENT_TYPE_FORM_URLENCODED,
        params: [{name: 'foo', value: 'bar'}]
      },
      url: 'http://localhost',
      authentication: {
        type: AUTH_BASIC,
        username: 'user',
        password: 'pass'
      },
      settingStoreCookies: false,
      settingSendCookies: false
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(
      renderedRequest,
      workspace,
      settings
    );

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        CUSTOMREQUEST: 'GET',
        ACCEPT_ENCODING: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Content-Type: application/json',
          'Expect: ',
          'Transfer-Encoding: ',
          'Accept: */*',
          'Accept-Encoding: '
        ],
        NOPROGRESS: false,
        USERNAME: 'user',
        PASSWORD: 'pass',
        POSTFIELDS: 'foo=bar',
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://localhost/?foo%20bar=hello%26world',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('sends a file', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();
    await models.cookieJar.create({parentId: workspace._id});
    const fileName = pathResolve(pathJoin(__dirname, './testfile.txt'));

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      headers: [{name: 'Content-Type', value: 'application/octet-stream'}],
      url: 'http://localhost',
      method: 'POST',
      body: {mimeType: CONTENT_TYPE_FILE, fileName}
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(
      renderedRequest,
      workspace,
      settings
    );

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);

    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        POST: 1,
        ACCEPT_ENCODING: '',
        CUSTOMREQUEST: 'POST',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Content-Type: application/octet-stream',
          'Expect: ',
          'Transfer-Encoding: ',
          'Accept: */*',
          'Accept-Encoding: '
        ],
        NOPROGRESS: false,
        INFILESIZE_LARGE: 26,
        PROXY: '',
        READDATA: fs.readFileSync(fileName, 'utf8'),
        TIMEOUT_MS: 0,
        UPLOAD: 1,
        URL: 'http://localhost/',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('sends multipart form data', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();
    await models.cookieJar.create({parentId: workspace._id});
    const fileName = pathResolve(pathJoin(__dirname, './testfile.txt'));
    const uniFile = pathResolve(pathJoin(__dirname, './üñîçø∂é.txt'));

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      headers: [{name: 'Content-Type', value: 'multipart/form-data'}],
      url: 'http://localhost',
      method: 'POST',
      body: {
        mimeType: CONTENT_TYPE_FORM_DATA,
        params: [
          // Should ignore value and send the file since type is set to file
          {name: 'foo', fileName: fileName, value: 'bar', type: 'file'},
          {name: 'üñî', fileName: uniFile, value: 'ignored', type: 'file'},

          // Some extra params
          {name: 'a', value: 'AA'},
          {name: 'baz', value: 'qux', disabled: true}
        ]
      }
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(
      renderedRequest,
      workspace,
      settings
    );
    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        POST: 1,
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        CUSTOMREQUEST: 'POST',
        HTTPHEADER: [
          'Content-Type: multipart/form-data; boundary=X-INSOMNIA-BOUNDARY',
          'Expect: ',
          'Transfer-Encoding: ',
          'Accept: */*',
          'Accept-Encoding: '
        ],
        INFILESIZE_LARGE: 530,
        NOPROGRESS: false,
        READDATA: [
          `--${DEFAULT_BOUNDARY}`,
          'Content-Disposition: form-data; name="foo"; filename="testfile.txt"',
          'Content-Type: text/plain',
          '',
          fs.readFileSync(fileName),
          `--${DEFAULT_BOUNDARY}`,
          'Content-Disposition: form-data; ' +
          "name*=utf-8''%C3%BC%C3%B1%C3%AE; " +
          "filename*=utf-8''%C3%BC%C3%B1%C3%AE%C3%A7%C3%B8%E2%88%82%C3%A9.txt",
          'Content-Type: text/plain', // TODO: infer charset for text/plain...?
          '',
          fs.readFileSync(uniFile),
          `--${DEFAULT_BOUNDARY}`,
          'Content-Disposition: form-data; name="a"',
          '',
          'AA',
          `--${DEFAULT_BOUNDARY}--`,
          ''
        ].join('\r\n'),
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://localhost/',
        UPLOAD: 1,
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('uses unix socket', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      url: 'http://unix:/my/socket:/my/path',
      method: 'GET'
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(renderedRequest, workspace, settings);

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        CUSTOMREQUEST: 'GET',
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Accept: */*',
          'Accept-Encoding: ',
          'content-type: '
        ],
        NOPROGRESS: false,
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://my/path',
        UNIX_SOCKET_PATH: '/my/socket',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('uses works with HEAD', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      url: 'http://localhost:3000/foo/bar',
      method: 'HEAD'
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(renderedRequest, workspace, settings);

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        NOBODY: 1,
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Accept: */*',
          'Accept-Encoding: ',
          'content-type: '
        ],
        NOPROGRESS: false,
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://localhost:3000/foo/bar',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('uses works with "unix" host', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      url: 'http://unix:3000/my/path',
      method: 'GET'
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(renderedRequest, workspace, settings);

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        CUSTOMREQUEST: 'GET',
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Accept: */*',
          'Accept-Encoding: ',
          'content-type: '
        ],
        NOPROGRESS: false,
        PROXY: '',
        TIMEOUT_MS: 0,
        URL: 'http://unix:3000/my/path',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });

  it('uses netrc', async () => {
    const workspace = await models.workspace.create();
    const settings = await models.settings.create();

    const request = Object.assign(models.request.init(), {
      _id: 'req_123',
      parentId: workspace._id,
      authentication: {
        type: AUTH_NETRC
      }
    });

    const renderedRequest = await getRenderedRequest(request);
    const response = await networkUtils._actuallySend(renderedRequest, workspace, settings);

    const bodyBuffer = models.response.getBodyBuffer(response);
    const body = JSON.parse(bodyBuffer);
    expect(body).toEqual({
      meta: {},
      features: {
        NO_HEADER_PARSING: true,
        NO_DATA_PARSING: true
      },
      options: {
        CUSTOMREQUEST: 'GET',
        ACCEPT_ENCODING: '',
        COOKIEFILE: '',
        FOLLOWLOCATION: true,
        HTTPHEADER: [
          'Accept: */*',
          'Accept-Encoding: ',
          'content-type: '
        ],
        NOPROGRESS: false,
        PROXY: '',
        TIMEOUT_MS: 0,
        NETRC: 2,
        URL: '',
        USERAGENT: `insomnia/${getAppVersion()}`,
        VERBOSE: true
      }
    });
  });
});

describe('_getAwsAuthHeaders', () => {
  beforeEach(globalBeforeEach);
  it('should generate expected headers', () => {
    const req = {
      authentication: {
        type: AUTH_AWS_IAM,
        accessKeyId: 'AKIA99999999',
        secretAccessKey: 'SAK9999999999999',
        sessionToken: 'ST9999999999999999'
      },
      headers: [{name: 'content-type', value: 'application/json'}],
      body: {text: '{}'},
      method: 'POST',
      url: 'https://example.com/path?query=q1'
    };
    const credentials = {
      accessKeyId: req.authentication.accessKeyId || '',
      secretAccessKey: req.authentication.secretAccessKey || '',
      sessionToken: req.authentication.sessionToken || ''
    };
    const headers = networkUtils._getAwsAuthHeaders(
      credentials,
      req.headers,
      req.body.text,
      req.url,
      req.method
    );
    expect(filterHeaders(headers, 'x-amz-date')[0].value)
      .toMatch(/^\d{8}T\d{6}Z$/);
    expect(filterHeaders(headers, 'host')[0].value).toEqual('example.com');
    expect(filterHeaders(headers, 'authorization')[0].value)
      .toMatch(/^AWS4-HMAC-SHA256 Credential=AKIA99999999/);
    expect(filterHeaders(headers, 'content-type'))
      .toHaveLength(0);
  });

  it('should handle sparse request', () => {
    const req = {
      authentication: {
        type: AUTH_AWS_IAM,
        accessKeyId: 'AKIA99999999',
        secretAccessKey: 'SAK9999999999999',
        sessionToken: 'ST99999999999999'
      },
      headers: [
        'Accept: */*',
        'Accept-Encoding: '
      ],
      url: 'https://example.com',
      method: 'GET'
    };
    const credentials = {
      accessKeyId: req.authentication.accessKeyId || '',
      secretAccessKey: req.authentication.secretAccessKey || '',
      sessionToken: req.authentication.sessionToken || ''
    };
    const headers = networkUtils._getAwsAuthHeaders(
      credentials,
      req.headers,
      null,
      req.url,
      req.method
    );

    expect(filterHeaders(headers, 'x-amz-date')[0].value)
      .toMatch(/^\d{8}T\d{6}Z$/);
    expect(filterHeaders(headers, 'host')[0].value).toEqual('example.com');
    expect(filterHeaders(headers, 'authorization')[0].value)
      .toMatch(/^AWS4-HMAC-SHA256 Credential=AKIA99999999/);
    expect(filterHeaders(headers, 'content-type'))
      .toHaveLength(0);
  });
});

describe('_parseHeaders', () => {
  const basicHeaders = [
    'HTTP/1.1 301 Moved Permanently',
    'X-Powered-By: Express',
    'location: http://localhost:3000/',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Length: 17',
    'ETag: W/"11-WKzg6oYof0o8Mliwrz5pkw"',
    'Duplicate: foo',
    'Duplicate: bar',
    'Date: Mon, 13 Nov 2017 22:06:28 GMT',
    'Foo', // Invalid header
    ''
  ];

  const minimalHeaders = [
    'HTTP/1.1 301',
    ''
  ];

  it('Parses single response headers', () => {
    expect(networkUtils._parseHeaders(Buffer.from(basicHeaders.join('\n')))).toEqual([
      {
        code: 301,
        version: 'HTTP/1.1',
        reason: 'Moved Permanently',
        headers: [
          {name: 'X-Powered-By', value: 'Express'},
          {name: 'location', value: 'http://localhost:3000/'},
          {name: 'Content-Type', value: 'text/plain; charset=utf-8'},
          {name: 'Content-Length', value: '17'},
          {name: 'ETag', value: 'W/"11-WKzg6oYof0o8Mliwrz5pkw"'},
          {name: 'Duplicate', value: 'foo'},
          {name: 'Duplicate', value: 'bar'},
          {name: 'Date', value: 'Mon, 13 Nov 2017 22:06:28 GMT'},
          {name: 'Foo', value: ''}
        ]
      }
    ]);
  });

  it('Parses Windows newlines', () => {
    expect(networkUtils._parseHeaders(Buffer.from(basicHeaders.join('\r\n')))).toEqual([
      {
        code: 301,
        version: 'HTTP/1.1',
        reason: 'Moved Permanently',
        headers: [
          {name: 'X-Powered-By', value: 'Express'},
          {name: 'location', value: 'http://localhost:3000/'},
          {name: 'Content-Type', value: 'text/plain; charset=utf-8'},
          {name: 'Content-Length', value: '17'},
          {name: 'ETag', value: 'W/"11-WKzg6oYof0o8Mliwrz5pkw"'},
          {name: 'Duplicate', value: 'foo'},
          {name: 'Duplicate', value: 'bar'},
          {name: 'Date', value: 'Mon, 13 Nov 2017 22:06:28 GMT'},
          {name: 'Foo', value: ''}
        ]
      }
    ]);
  });

  it('Parses multiple responses', () => {
    const blobs = basicHeaders.join('\r\n') + '\n' + minimalHeaders.join('\n');
    expect(networkUtils._parseHeaders(Buffer.from(blobs))).toEqual([
      {
        code: 301,
        version: 'HTTP/1.1',
        reason: 'Moved Permanently',
        headers: [
          {name: 'X-Powered-By', value: 'Express'},
          {name: 'location', value: 'http://localhost:3000/'},
          {name: 'Content-Type', value: 'text/plain; charset=utf-8'},
          {name: 'Content-Length', value: '17'},
          {name: 'ETag', value: 'W/"11-WKzg6oYof0o8Mliwrz5pkw"'},
          {name: 'Duplicate', value: 'foo'},
          {name: 'Duplicate', value: 'bar'},
          {name: 'Date', value: 'Mon, 13 Nov 2017 22:06:28 GMT'},
          {name: 'Foo', value: ''}
        ]
      },
      {
        code: 301,
        headers: [],
        reason: '',
        version: 'HTTP/1.1'
      }
    ]);
  });
});
