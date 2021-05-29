import url from 'url';
import slugify from 'slugify';
import {
  OpenApi3Spec,
  OA3PathItem,
  OA3Server,
  OA3Operation,
} from './types/openapi3';
import { PluginBase, xKongName, XKongPlugin } from './types/kong';
import { DCPlugin, K8sKongPlugin, K8sKongPluginBase } from './types';

export function getServers(obj: OpenApi3Spec | OA3PathItem) {
  return obj.servers || [];
}

export function getPaths(obj: OpenApi3Spec) {
  return obj.paths || {};
}

export function getAllServers(api: OpenApi3Spec) {
  const servers = getServers(api);

  for (const path of Object.keys(api.paths)) {
    for (const server of getServers(api.paths[path])) {
      servers.push(server);
    }
  }

  return servers;
}

export const getSecurity = (obj: OpenApi3Spec | OA3Operation | null) => obj?.security || [];

interface SlugifyOptions {
  replacement?: string;
  lower?: boolean;
}

export function getName(
  api: OpenApi3Spec,
  defaultValue?: string,
  slugifyOptions?: SlugifyOptions,
  isKubernetes?: boolean,
) {
  let rawName: string | undefined = '';

  // Get $.info.x-kubernetes-ingress-metadata.name
  rawName = isKubernetes ? api.info?.['x-kubernetes-ingress-metadata']?.name : '';

  // Get $.x-kong-name
  rawName = rawName || api[xKongName];

  // Get $.info.title
  rawName = rawName || api.info?.title;

  // Make sure the name is a string
  const defaultName = defaultValue || 'openapi';
  const name = typeof rawName === 'string' && rawName ? rawName : defaultName;

  // Slugify
  return generateSlug(name, slugifyOptions);
}

export function generateSlug(str: string, options: SlugifyOptions = {}) {
  options.replacement = options.replacement || '_';
  options.lower = options.lower || false;
  return slugify(str, options);
}

/** characters in curly braces not immediately followed by `://`, e.g. `{foo}` will match but `{foo}://` will not. */
const pathVariableSearchValue = /{([^}]+)}(?!:\/\/)/g;

export function pathVariablesToRegex(p: string) {
  // match anything except whitespace and '/'
  const result = p.replace(pathVariableSearchValue, '(?<$1>[^\\/\\s]+)');
  // add a line ending because it is a regex
  return result + '$';
}

export function getPluginNameFromKey(key: string) {
  return key.replace(/^x-kong-plugin-/, '');
}

export function isPluginKey(key: string) {
  return key.indexOf('x-kong-plugin-') === 0;
}

export const HttpMethod = {
  get: 'GET',
  put: 'PUT',
  post: 'POST',
  delete: 'DELETE',
  options: 'OPTIONS',
  head: 'HEAD',
  patch: 'PATCH',
  trace: 'TRACE',
} as const;

export type HttpMethodType = typeof HttpMethod[keyof typeof HttpMethod];

export function isHttpMethodKey(key: string): key is HttpMethodType {
  const uppercaseKey = key.toUpperCase();
  return Object.values(HttpMethod).some(method => method === uppercaseKey);
}

export function getMethodAnnotationName(method: HttpMethodType) {
  return `${method}-method`.toLowerCase();
}

export function parseUrl(urlStr: string) {
  const parsed = url.parse(urlStr);

  if (!parsed.port && parsed.protocol === 'https:') {
    parsed.port = '443';
  } else if (!parsed.port && parsed.protocol === 'http:') {
    parsed.port = '80';
  }

  parsed.protocol = parsed.protocol || 'http:';

  if (parsed.hostname && parsed.port) {
    parsed.host = `${parsed.hostname}:${parsed.port}`;
  } else if (parsed.hostname) {
    parsed.host = parsed.hostname;
  }

  return parsed;
}

export function fillServerVariables(server: OA3Server) {
  let finalUrl = server.url;
  const variables = server.variables || {};

  for (const name of Object.keys(variables)) {
    const defaultValue = variables[name].default;

    if (!defaultValue) {
      throw new Error(`Server variable "${name}" missing default value`);
    }

    finalUrl = finalUrl.replace(`{${name}}`, defaultValue);
  }

  return finalUrl;
}

export function joinPath(p1: string, p2: string) {
  p1 = p1.replace(/\/$/, '');
  p2 = p2.replace(/^\//, '');
  return `${p1}/${p2}`;
}

// Select first unique instance of an array item depending on the property selector
export function distinctByProperty<T>(arr: T[], propertySelector: (item: T) => any): T[] {
  const result: T[] = [];
  const set = new Set();

  for (const item of arr.filter(i => i)) {
    const selector = propertySelector(item);

    if (set.has(selector)) {
      continue;
    }

    set.add(selector);
    result.push(item);
  }

  return result;
}

/** used only for testing */
export interface DummyPlugin extends PluginBase<'dummy'> {
  config: {
    foo: 'bar';
  };
}
export type XKongPluginDummy = XKongPlugin<DummyPlugin>;
export const pluginDummy: XKongPluginDummy = {
  'x-kong-plugin-dummy': {
    name: 'dummy',
    config: {
      foo: 'bar',
    },
  },
};

/**
 * This simulates what a user would do when creating a custom plugin.
 *
 * In the user's case they would, in practice, use module augmentation to extend DCPlugin, however a simple union achieves the same goal, here.
 */
export type UserDCPlugin = DCPlugin | DummyPlugin;

/**
 * This simulates what a user would do when creating a custom plugin.
 *
 * In the user's case they would, in practice, use module augmentation to extend K8sKongPlugin, however a simple union achieves the same goal, here.
 */
export type UserK8sPlugin = K8sKongPlugin | K8sKongPluginBase<DummyPlugin>

/**
 * This simulates what a user would do when creating a custom plugin.
 *
 * In the user's case they would, in practice, use module augmentation to extend K8sKongPlugin, however a simple union achieves the same goal, here.
 */
export type UserXKongPlugin = XKongPlugin<Plugin> | XKongPlugin<DummyPlugin>

/** This function is written in such a way as to allow mutations in tests but without affecting other tests. */
export const getSpec = (overrides: Partial<OpenApi3Spec> = {}): OpenApi3Spec =>
  JSON.parse(
    JSON.stringify({
      openapi: '3.0',
      info: {
        version: '1.0',
        title: 'My API',
      },
      servers: [
        {
          url: 'https://server1.com/path',
        },
      ],
      paths: {
        '/cats': {
          'x-kong-name': 'Cat stuff',
          summary: 'summary is ignored',
          post: {},
        },
        '/dogs': {
          summary: 'Dog stuff',
          get: {},
          post: {
            summary: 'Ignored summary',
          },
        },
        '/birds/{id}': {
          get: {},
        },
      },
      ...overrides,
    }),
  );
