import nunjucks from 'nunjucks';
import * as extensions from './extensions';

/**
 * Render text based on stuff
 * @param {String} text - Nunjucks template in text form
 * @param {Object} [config] - Config options for rendering
 * @param {Object} [config.context] - Context to render with
 * @param {Object} [config.path] - Path to include in the error message
 */
export function render (text, config = {}) {
  const context = config.context || {};
  const path = config.path || null;

  return new Promise((resolve, reject) => {
    const env = getNunjucksEnvironment(true);
    env.renderString(text, context, (err, result) => {
      if (err) {
        const sanitizedMsg = err.message
          .replace(/\(unknown path\)\n/, '')
          .replace(/\[Line \d+, Column \d*]/, '')
          .replace(/^\s*Error:\s*/, '')
          .trim();

        const location = err.message.match(/\[Line (\d)+, Column (\d)*]/);
        const line = location ? parseInt(location[1]) : 1;
        const column = location ? parseInt(location[2]) : 1;
        const reason = err.message.includes('attempted to output null or undefined value')
          ? 'undefined'
          : 'error';

        const newError = new Error(sanitizedMsg);
        newError.path = path || null;
        newError.message = sanitizedMsg;
        newError.location = {line, column};
        newError.type = 'render';
        newError.reason = reason;
        reject(newError);
      } else {
        resolve(result);
      }
    });
  });
}

function getNunjucksEnvironment (strict = false) {
  return strict ? _getStrictEnv() : _getNormalEnv();
}

// ~~~~~~~~~~~~~ //
// Private Stuff //
// ~~~~~~~~~~~~~ //

let _nunjucksEnvironment = null;
function _getNormalEnv () {
  if (!_nunjucksEnvironment) {
    _nunjucksEnvironment = nunjucks.configure({
      autoescape: false
    });

    for (const Cls of extensions.all()) {
      _nunjucksEnvironment.addExtension(Cls.name, new Cls());
    }
  }

  return _nunjucksEnvironment;
}

let _nunjucksStrictEnvironment = null;
function _getStrictEnv () {
  if (!_nunjucksStrictEnvironment) {
    _nunjucksStrictEnvironment = nunjucks.configure({
      autoescape: false,
      throwOnUndefined: true
    });

    for (const Cls of extensions.all()) {
      _nunjucksStrictEnvironment.addExtension(Cls.name, new Cls());
    }
  }

  return _nunjucksStrictEnvironment;
}
