// @flow
import * as electron from 'electron';
import mimes from 'mime-types';
import fs from 'fs';
import path from 'path';
import type {RequestBodyParameter} from '../models/request';
import type {Settings} from '../models/settings';

export const DEFAULT_BOUNDARY = 'X-INSOMNIA-BOUNDARY';

export async function buildMultipart (params: Array<RequestBodyParameter>, settings: Settings) {
  return new Promise(async (resolve: Function, reject: Function) => {
    const filePath = path.join(electron.remote.app.getPath('temp'), Math.random() + '.body');
    const writeStream = fs.createWriteStream(filePath);
    const lineBreak = '\r\n';
    const useRFC2231 = settings !== undefined ? settings.useRFC2231ForMultipart : true;
    let totalSize = 0;

    function addFile (path: string): Promise<void> {
      return new Promise((resolve, reject) => {
        let size;
        try {
          size = fs.statSync(path).size;
        } catch (err) {
          reject(err);
        }
        const stream = fs.createReadStream(path);
        stream.once('end', () => {
          resolve();
        });
        stream.pipe(writeStream, {end: false});
        totalSize += size;
      });
    }

    const addString = (v: string) => {
      const buffer = Buffer.from(v);
      writeStream.write(buffer);
      totalSize += buffer.length;
    };

    const encodeParameter = (name: string, value: string, useRFC2231: boolean) => {
      const escapedValue = value.replace(/"/g, '\\"');
      if (!useRFC2231) {
        return `${name}="${escapedValue}"`;
      }

      const encodedValue = encodeURIComponent(value);
      const isASCII = value === encodedValue;
      return `${name}${
        isASCII
        ? `="${escapedValue}"`
        : `*=utf-8''${encodedValue}` // http://test.greenbytes.de/tech/tc2231/
      }`;
    };

    for (const param of params) {
      const noName = !param.name;
      const noValue = !(param.value || param.fileName);

      if (noName && noValue) {
        continue;
      }

      addString(`--${DEFAULT_BOUNDARY}`);
      addString(lineBreak);

      if (param.type === 'file' && param.fileName) {
        const name = param.name || '';
        const fileName = param.fileName;
        const baseName = path.basename(fileName);
        const contentType = (
          param.contentType ||
          mimes.lookup(fileName) ||
          'application/octet-stream'
        );

        addString(
          'Content-Disposition: form-data; ' +
          `${encodeParameter('name', name, useRFC2231)}; ` +
          `${encodeParameter('filename', baseName, useRFC2231)}`
        );
        addString(lineBreak);
        addString(`Content-Type: ${contentType}`);
        addString(lineBreak);
        addString(lineBreak);
        try {
          await addFile(fileName);
        } catch (err) {
          return reject(err);
        }
      } else {
        const name = param.name || '';
        const value = param.value || '';
        addString(
          'Content-Disposition: form-data; ' +
          `${encodeParameter('name', name, useRFC2231)}`
        );
        addString(lineBreak);
        addString(lineBreak);
        addString(value);
      }

      addString(lineBreak);
    }

    addString(`--${DEFAULT_BOUNDARY}--`);
    addString(lineBreak);

    writeStream.on('error', err => {
      reject(err);
    });

    writeStream.on('close', () => {
      resolve({boundary: DEFAULT_BOUNDARY, filePath, contentLength: totalSize});
    });

    // We're done here. End the stream and tell FS to save/close the file.
    writeStream.end();
  });
}
