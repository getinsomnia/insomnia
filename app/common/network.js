import networkRequest from 'request';
import {parse as urlParse} from 'url';
import * as models from '../models';
import * as querystring from './querystring';
import {buildFromParams} from './querystring';
import * as util from './misc.js';
import {DEBOUNCE_MILLIS, STATUS_CODE_PEBKAC, CONTENT_TYPE_FORM_DATA, CONTENT_TYPE_FORM_URLENCODED} from './constants';
import {jarFromCookies, cookiesFromJar, cookieHeaderValueForUri} from './cookies';
import {setDefaultProtocol} from './misc';
import {getRenderedRequest} from './render';
import {swapHost} from './dns';
import {CONTENT_TYPE_FILE} from './constants';
import * as fs from 'fs';

let cancelRequestFunction = null;

export function cancelCurrentRequest () {
  if (typeof cancelRequestFunction === 'function') {
    cancelRequestFunction();
  }
}

export function _buildRequestConfig (renderedRequest, patch = {}) {
  const config = {
    // Setup redirect rules
    followAllRedirects: true,
    followRedirect: true,
    maxRedirects: 50, // Arbitrary (large) number
    timeout: 0,

    // Unzip gzipped responses
    gzip: true,

    // Time the request
    time: true,

    // SSL Checking
    rejectUnauthorized: true,

    // Proxy
    proxy: null,

    // Use keep-alive by default
    forever: true,

    // Force request to return response body as a Buffer instead of string
    encoding: null,
  };

  // Set the body
  if (renderedRequest.body.mimeType === CONTENT_TYPE_FORM_URLENCODED) {
    config.body = buildFromParams(renderedRequest.body.params || [], true);
  } else if (renderedRequest.body.mimeType === CONTENT_TYPE_FORM_DATA) {
    // TODO: This
  } else if (renderedRequest.body.mimeType === CONTENT_TYPE_FILE) {
    config.body = fs.readFileSync(renderedRequest.body.fileName);
  } else {
    config.body = renderedRequest.body.text || '';
  }

  // Set the method
  config.method = renderedRequest.method;

  // Set the headers
  const headers = {};
  for (let i = 0; i < renderedRequest.headers.length; i++) {
    let header = renderedRequest.headers[i];
    if (header.name) {
      headers[header.name] = header.value;
    }
  }
  config.headers = headers;

  // Set the URL, including the query parameters
  const qs = querystring.buildFromParams(renderedRequest.parameters);
  const url = querystring.joinURL(renderedRequest.url, qs);
  config.url = util.prepareUrlForSending(url);
  config.headers.host = urlParse(config.url).host;

  return Object.assign(config, patch);
}

export function _actuallySend (renderedRequest, settings, forceIPv4 = false) {
  return new Promise(async (resolve, reject) => {
    // Detect and set the proxy based on the request protocol
    // NOTE: request does not have a separate settings for http/https proxies
    const {protocol} = urlParse(renderedRequest.url);
    const {httpProxy, httpsProxy} = settings;
    const proxyHost = protocol === 'https:' ? httpsProxy : httpProxy;
    const proxy = proxyHost ? setDefaultProtocol(proxyHost) : null;

    let config;
    try {
      config = _buildRequestConfig(renderedRequest, {
        jar: null, // We're doing our own cookies
        proxy: proxy,
        followAllRedirects: settings.followRedirects,
        followRedirect: settings.followRedirects,
        timeout: settings.timeout > 0 ? settings.timeout : null,
        rejectUnauthorized: settings.validateSSL
      }, true);
    } catch (e) {
      const response = await models.response.create({
        parentId: renderedRequest._id,
        elapsedTime: 0,
        statusMessage: 'Error',
        error: e.message
      });
      return resolve(response);
    }

    // Add the cookie header to the request
    const cookieJar = renderedRequest.cookieJar;
    const jar = jarFromCookies(cookieJar.cookies);
    const existingCookieHeaderName = Object.keys(config.headers).find(k => k.toLowerCase() === 'cookie');
    const cookieString = await cookieHeaderValueForUri(jar, config.url);

    if (cookieString && existingCookieHeaderName) {
      config.headers[existingCookieHeaderName] += `; ${cookieString}`;
    } else if (cookieString) {
      config.headers['Cookie'] = cookieString;
    }

    // Do DNS lookup ourselves
    // We don't want to let NodeJS do DNS, because it doesn't use
    // getaddrinfo by default. Instead, it first tries to reach out
    // to the network.
    const originalUrl = config.url;
    config.url = await swapHost(config.url, forceIPv4);

    // TODO: Handle redirects ourselves
    const requestStartTime = Date.now();
    const req = networkRequest(config, async (err, networkResponse) => {
      if (err) {
        const isShittyParseError = err.toString() === 'Error: Parse Error';

        // Failed to connect while prioritizing IPv6 address, fallback to IPv4
        const isNetworkRelatedError = (
          err.code === 'ECONNREFUSED' || // Could not talk to server
          err.code === 'EHOSTUNREACH' || // Could not reach host
          err.code === 'ENETUNREACH' // Could not access the network
        );

        if (!forceIPv4 && isNetworkRelatedError) {
          console.log('-- Falling back to IPv4 --');
          _actuallySend(renderedRequest, settings, true).then(resolve, reject);
          return;
        }

        let message = err.toString();
        if (isShittyParseError) {
          message = `Error parsing response after ${err.bytesParsed} bytes.\n\n`;
          message += `Code: ${err.code}`;
        }

        await models.response.create({
          parentId: renderedRequest._id,
          error: message
        });

        return reject(err);
      }

      // Format the headers into Insomnia format
      // TODO: Move this to a better place
      const headers = [];
      for (const name of Object.keys(networkResponse.headers)) {
        const tmp = networkResponse.headers[name];
        const values = Array.isArray(tmp) ? tmp : [tmp];
        for (const value of values) {
          headers.push({name, value});
        }
      }

      // Update the cookie jar
      // NOTE: Since we're doing own DNS, we can't rely on Request to do this
      const setCookieHeaders = util.getSetCookieHeaders(headers);
      if (setCookieHeaders.length) {
        for (const h of setCookieHeaders) {
          try {
            jar.setCookieSync(h.value, originalUrl);
          } catch (e) {
            console.warn('Failed to parse set-cookie', h.value);
          }
        }
        const cookies = await cookiesFromJar(jar);
        await models.cookieJar.update(cookieJar, {cookies});
      }

      const responsePatch = {
        parentId: renderedRequest._id,
        statusCode: networkResponse.statusCode,
        statusMessage: networkResponse.statusMessage,
        url: originalUrl, // TODO: Handle redirects somehow
        contentType: networkResponse.headers['content-type'] || '',
        elapsedTime: networkResponse.elapsedTime,
        bytesRead: networkResponse.body ? networkResponse.body.length : 0,
        body: networkResponse.body.toString('base64'),
        encoding: 'base64',
        headers: headers
      };

      models.response.create(responsePatch).then(resolve, reject);
    });

    // Kind of hacky, but this is how we cancel a request.
    cancelRequestFunction = async () => {
      req.abort();

      await models.response.create({
        parentId: renderedRequest._id,
        elapsedTime: Date.now() - requestStartTime,
        statusMessage: 'Cancelled',
        error: 'The request was cancelled'
      });

      return reject(new Error('Cancelled'));
    }
  })
}

export async function send (requestId, environmentId) {
  // First, lets wait for all debounces to finish
  await util.delay(DEBOUNCE_MILLIS);

  const request = await models.request.getById(requestId);
  const settings = await models.settings.getOrCreate();

  let renderedRequest;

  try {
    renderedRequest = await getRenderedRequest(request, environmentId);
  } catch (e) {
    // Failed to render. Must be the user's fault
    return await models.response.create({
      parentId: request._id,
      statusCode: STATUS_CODE_PEBKAC,
      error: e.message
    });
  }

  // Render succeeded so we're good to go!
  return await _actuallySend(renderedRequest, settings);
}
