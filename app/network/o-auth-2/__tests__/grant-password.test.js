import getToken from '../grant-password';
import {globalBeforeEach} from '../../../__jest__/before-each';
import * as network from '../../network';
import {getTempDir} from '../../../common/constants';
import path from 'path';
import fs from 'fs';

// Mock some test things
const ACCESS_TOKEN_URL = 'https://foo.com/access_token';
const CLIENT_ID = 'client_123';
const CLIENT_SECRET = 'secret_12345456677756343';
const USERNAME = 'user';
const PASSWORD = 'password';
const SCOPE = 'scope_123';

describe('password', () => {
  beforeEach(globalBeforeEach);
  it('gets token with JSON and basic auth', async () => {
    const bodyPath = path.join(getTempDir(), 'foo.response');

    fs.writeFileSync(bodyPath, JSON.stringify({
      access_token: 'token_123',
      token_type: 'token_type',
      scope: SCOPE
    }));

    network.sendWithSettings = jest.fn(() => ({
      bodyPath,
      statusCode: 200,
      headers: [{name: 'Content-Type', value: 'application/json'}]
    }));

    const result = await getToken(
      'req_1',
      ACCESS_TOKEN_URL,
      false,
      CLIENT_ID,
      CLIENT_SECRET,
      USERNAME,
      PASSWORD,
      SCOPE
    );

    // Check the request to fetch the token
    expect(network.sendWithSettings.mock.calls).toEqual([['req_1', {
      url: ACCESS_TOKEN_URL,
      method: 'POST',
      body: {
        mimeType: 'application/x-www-form-urlencoded',
        params: [
          {name: 'grant_type', value: 'password', disabled: false},
          {name: 'username', value: USERNAME, disabled: false},
          {name: 'password', value: PASSWORD, disabled: false},
          {name: 'scope', value: SCOPE, disabled: false}
        ]
      },
      headers: [
        {name: 'Content-Type', value: 'application/x-www-form-urlencoded'},
        {name: 'Accept', value: 'application/x-www-form-urlencoded, application/json'},
        {name: 'Authorization', value: 'Basic Y2xpZW50XzEyMzpzZWNyZXRfMTIzNDU0NTY2Nzc3NTYzNDM='}
      ]
    }]]);

    // Check the expected value
    expect(result).toEqual({
      access_token: 'token_123',
      expires_in: null,
      token_type: 'token_type',
      refresh_token: null,
      scope: SCOPE,
      error: null,
      error_uri: null,
      error_description: null
    });
  });

  it('gets token with urlencoded and body auth', async () => {
    const bodyPath = path.join(getTempDir(), 'foo.response');

    fs.writeFileSync(bodyPath, JSON.stringify({
      access_token: 'token_123',
      token_type: 'token_type',
      scope: SCOPE
    }));

    network.sendWithSettings = jest.fn(() => ({
      bodyPath,
      statusCode: 200,
      headers: [{name: 'Content-Type', value: 'application/x-www-form-urlencoded'}]
    }));

    const result = await getToken(
      'req_1',
      ACCESS_TOKEN_URL,
      true,
      CLIENT_ID,
      CLIENT_SECRET,
      USERNAME,
      PASSWORD,
      SCOPE
    );

    // Check the request to fetch the token
    expect(network.sendWithSettings.mock.calls).toEqual([['req_1', {
      url: ACCESS_TOKEN_URL,
      method: 'POST',
      body: {
        mimeType: 'application/x-www-form-urlencoded',
        params: [
          {name: 'grant_type', value: 'password', disabled: false},
          {name: 'username', value: USERNAME, disabled: false},
          {name: 'password', value: PASSWORD, disabled: false},
          {name: 'scope', value: SCOPE, disabled: false},
          {name: 'client_id', value: CLIENT_ID, disabled: false},
          {name: 'client_secret', value: CLIENT_SECRET, disabled: false}
        ]
      },
      headers: [
        {name: 'Content-Type', value: 'application/x-www-form-urlencoded'},
        {name: 'Accept', value: 'application/x-www-form-urlencoded, application/json'}
      ]
    }]]);

    // Check the expected value
    expect(result).toEqual({
      access_token: 'token_123',
      expires_in: null,
      token_type: 'token_type',
      refresh_token: null,
      scope: SCOPE,
      error: null,
      error_uri: null,
      error_description: null
    });
  });
});
