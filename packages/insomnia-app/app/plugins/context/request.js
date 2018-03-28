// @flow
import type {RenderedRequest} from '../../common/render';
import * as misc from '../../common/misc';

export function init (
  renderedRequest: RenderedRequest,
  renderedContext: Object
): {request: Object} {
  if (!renderedRequest) {
    throw new Error('contexts.request initialized without request');
  }

  return {
    request: {
      getId (): string {
        return renderedRequest._id;
      },
      getBodyText (): string {
        return renderedRequest.body.text || '';
      },
      getName (): string {
        return renderedRequest.name;
      },
      getUrl (): string {
        return renderedRequest.url;
      },
      getMethod (): string {
        return renderedRequest.method;
      },
      setBodyText (text: string): void {
        renderedRequest.body.text = text;
      },
      setCookie (name: string, value: string): void {
        const cookie = renderedRequest.cookies.find(c => c.name === name);
        if (cookie) {
          cookie.value = value;
        } else {
          renderedRequest.cookies.push({name, value});
        }
      },
      getEnvironmentVariable (name: string): string | number | boolean | Object | Array<any> | null {
        return renderedContext[name];
      },
      getEnvironment (): Object {
        return renderedContext;
      },
      getParameters (): Array<Object> {
        return renderedRequest.parameters;
      },
      getParameter (name: string): Object | null {
        const parameter = renderedRequest.parameters.find(p => p.name === name);
        return parameter ? parameter.value : '';
      },
      setParameter (name: string, value: string): void {
        const parameter = renderedRequest.parameters.find(p => p.name === name);
        if (parameter) {
          parameter.value = value;
        } else {
          renderedRequest.parameters.push({name, value});
        }
      },
      removeParameter (name: string): void {
        const index = renderedRequest.parameters.findIndex(p => p.name === name);
        if (index === -1) return;
        renderedRequest.parameters.splice(index, 1);
      },
      settingSendCookies (enabled: boolean) {
        renderedRequest.settingSendCookies = enabled;
      },
      settingStoreCookies (enabled: boolean) {
        renderedRequest.settingStoreCookies = enabled;
      },
      settingEncodeUrl (enabled: boolean) {
        renderedRequest.settingEncodeUrl = enabled;
      },
      settingDisableRenderRequestBody (enabled: boolean) {
        renderedRequest.settingDisableRenderRequestBody = enabled;
      },
      getHeader (name: string): string | null {
        const headers = misc.filterHeaders(renderedRequest.headers, name);
        if (headers.length) {
          // Use the last header if there are multiple of the same
          const header = headers[headers.length - 1];
          return header.value || '';
        } else {
          return null;
        }
      },
      getHeaders (): Array<{name: string, value: string}> {
        return renderedRequest.headers.map(h => ({name: h.name, value: h.value}));
      },
      hasHeader (name: string): boolean {
        return this.getHeader(name) !== null;
      },
      removeHeader (name: string): void {
        const headers = misc.filterHeaders(renderedRequest.headers, name);
        renderedRequest.headers = renderedRequest.headers.filter(
          h => !headers.includes(h)
        );
      },
      setHeader (name: string, value: string): void {
        const header = misc.filterHeaders(renderedRequest.headers, name)[0];
        if (header) {
          header.value = value;
        } else {
          this.addHeader(name, value);
        }
      },
      addHeader (name: string, value: string): void {
        const header = misc.filterHeaders(renderedRequest.headers, name)[0];
        if (!header) {
          renderedRequest.headers.push({name, value});
        }
      },
      getParameter (name: string): string | null {
        const parameters = misc.filterParameters(renderedRequest.parameters, name);
        if (parameters.length) {
          // Use the last parameter if there are multiple of the same
          const parameter = parameters[parameters.length - 1];
          return parameter.value || '';
        } else {
          return null;
        }
      },
      getParameters (): Array<{name: string, value: string}> {
        return renderedRequest.parameters.map(p => ({name: p.name, value: p.value}));
      },
      hasParameter (name: string): boolean {
        return this.getParameter(name) !== null;
      },
      removeParameter (name: string): void {
        const parameters = misc.filterParameters(renderedRequest.parameters, name);
        renderedRequest.parameters = renderedRequest.parameters.filter(
          p => !parameters.includes(p)
        );
      },
      setParameter (name: string, value: string): void {
        const parameter = misc.filterParameters(renderedRequest.parameters, name)[0];
        if (parameter) {
          parameter.value = value;
        } else {
          this.addParameter(name, value);
        }
      },
      addParameter (name: string, value: string): void {
        const parameter = misc.filterParameters(renderedRequest.parameters, name)[0];
        if (!parameter) {
          renderedRequest.parameters.push({name, value});
        }
      }

      // NOTE: For these to make sense, we'd need to account for cookies in the jar as well
      // addCookie (name: string, value: string): void {}
      // getCookie (name: string): string | null {}
      // removeCookie (name: string): void {}
    }
  };
}
