import CodeMirror from 'codemirror';
import 'codemirror/addon/mode/overlay';
import * as misc from '../../../../common/misc';

const NAME_MATCH_FLEXIBLE = /[\w.\][\-/]+$/;
const NAME_MATCH = /[\w.\][]+$/;
const AFTER_VARIABLE_MATCH = /{{\s*[\w.\][]*$/;
const AFTER_TAG_MATCH = /{%\s*[\w.\][]*$/;
const COMPLETE_AFTER_WORD = /[\w.\][-]+/;
const COMPLETE_AFTER_CURLIES = /[^{]*\{[{%]\s*/;
const COMPLETION_CLOSE_KEYS = /[}|-]/;
const ESCAPE_REGEX_MATCH = /[-[\]/{}()*+?.\\^$|]/g;
const MAX_HINT_LOOK_BACK = 100;
const HINT_DELAY_MILLIS = 400;
const TYPE_VARIABLE = 'variable';
const TYPE_TAG = 'tag';
const TYPE_CONSTANT = 'constant';
const MAX_CONSTANTS = -1;
const MAX_VARIABLES = -1;
const MAX_TAGS = -1;

const ICONS = {
  [TYPE_CONSTANT]: '&#x1d484;',
  [TYPE_VARIABLE]: '&#x1d465;',
  [TYPE_TAG]: '&fnof;'
};

const TAGS = [
  'uuid',
  'now',
  'response'
];

CodeMirror.defineExtension('isHintDropdownActive', function () {
  return (
    this.state.completionActive &&
    this.state.completionActive.data &&
    this.state.completionActive.data.list &&
    this.state.completionActive.data.list.length
  );
});

CodeMirror.defineOption('environmentAutocomplete', null, (cm, options) => {
  if (!options) {
    return;
  }

  async function completeAfter (cm, fn, showAllOnNoMatch = false) {
    // Bail early if didn't match the callback test
    if (fn && !fn()) {
      return;
    }

    // Bail early if completions are showing already
    if (cm.isHintDropdownActive()) {
      return;
    }

    // Put the hints in a container with class "dropdown__menu" (for themes)
    let hintsContainer = document.querySelector('#hints-container');
    if (!hintsContainer) {
      const el = document.createElement('div');
      el.id = 'hints-container';
      el.className = 'dropdown__menu';
      document.body.appendChild(el);
      hintsContainer = el;
    }

    const constants = options.getConstants && await options.getConstants();

    // Actually show the hint
    cm.showHint({
      // Insomnia-specific options
      extraConstants: constants || [],

      // Codemirror native options
      hint,
      showAllOnNoMatch,
      getContext: options.getContext,
      container: hintsContainer,
      closeCharacters: COMPLETION_CLOSE_KEYS,
      completeSingle: false,
      // closeOnUnfocus: false, // Good for debugging (inspector)
      extraKeys: {
        'Tab': (cm, widget) => {
          // Override default behavior and don't select hint on Tab
          widget.close();
          return CodeMirror.Pass;
        }
      }
    });
  }

  function completeIfInVariableName (cm) {
    completeAfter(cm, () => {
      const cur = cm.getCursor();
      const pos = CodeMirror.Pos(cur.line, cur.ch - MAX_HINT_LOOK_BACK);
      const range = cm.getRange(pos, cur);
      return range.match(COMPLETE_AFTER_WORD);
    });

    return CodeMirror.Pass;
  }

  function completeIfAfterTagOrVarOpen (cm) {
    completeAfter(cm, () => {
      const cur = cm.getCursor();
      const pos = CodeMirror.Pos(cur.line, cur.ch - MAX_HINT_LOOK_BACK);
      const range = cm.getRange(pos, cur);
      return range.match(COMPLETE_AFTER_CURLIES);
    }, true);

    return CodeMirror.Pass;
  }

  function completeForce (cm) {
    completeAfter(cm, null, true);
    return CodeMirror.Pass;
  }

  // Debounce this so we don't pop it open too frequently and annoy the user
  const debouncedCompleteAfter = misc.debounce(
    completeIfInVariableName,
    HINT_DELAY_MILLIS
  );

  cm.on('keydown', (cm, e) => {
    // Only operate on one-letter keys. This will filter out
    // any special keys (Backspace, Enter, etc)
    if (e.key.length > 1) {
      return;
    }

    debouncedCompleteAfter(cm);
  });

  // Add hot key triggers
  cm.addKeyMap({
    'Ctrl-Space': completeForce, // Force autocomplete on hotkey
    "' '": completeIfAfterTagOrVarOpen
  });
});

/**
 * Function to retrieve the list items
 * @param cm
 * @param options
 * @returns {Promise.<{list: Array, from, to}>}
 */
async function hint (cm, options) {
  // Get the text from the cursor back
  const cur = cm.getCursor();
  const pos = CodeMirror.Pos(cur.line, cur.ch - MAX_HINT_LOOK_BACK);
  const previousText = cm.getRange(pos, cur);

  // See if we're allowed matching tags, vars, or both
  const isInVariable = previousText.match(AFTER_VARIABLE_MATCH);
  const isInTag = previousText.match(AFTER_TAG_MATCH);
  const isInNothing = !isInVariable && !isInTag;
  const allowMatchingVariables = isInNothing || isInVariable;
  const allowMatchingTags = isInNothing || isInTag;
  const allowMatchingConstants = isInNothing;

  // Define fallback segment to match everything or nothing
  const fallbackSegment = options.showAllOnNoMatch ? '' : '__will_not_match_anything__';

  // See if we're completing a variable name
  const nameMatch = previousText.match(NAME_MATCH);
  const nameMatchLong = previousText.match(NAME_MATCH_FLEXIBLE);
  const nameSegment = nameMatch ? nameMatch[0] : fallbackSegment;
  const nameSegmentLong = nameMatchLong ? nameMatchLong[0] : fallbackSegment;

  // Actually try to match the list of things
  const context = await options.getContext();
  const allShortMatches = [];
  const allLongMatches = [];

  // Match variables
  if (allowMatchingVariables) {
    matchSegments(context.keys, nameSegment, TYPE_VARIABLE, MAX_VARIABLES)
      .map(m => allShortMatches.push(m));
    matchSegments(context.keys, nameSegmentLong, TYPE_VARIABLE, MAX_VARIABLES)
      .map(m => allLongMatches.push(m));
  }

  // Match constants
  if (allowMatchingConstants) {
    matchSegments(options.extraConstants, nameSegment, TYPE_CONSTANT, MAX_CONSTANTS)
      .map(m => allShortMatches.push(m));
    matchSegments(options.extraConstants, nameSegmentLong, TYPE_CONSTANT, MAX_CONSTANTS)
      .map(m => allLongMatches.push(m));
  }

  // Match tags
  if (allowMatchingTags) {
    matchSegments(TAGS, nameSegment, TYPE_TAG, MAX_TAGS)
      .map(m => allShortMatches.push(m));
    matchSegments(TAGS, nameSegmentLong, TYPE_TAG, MAX_TAGS)
      .map(m => allLongMatches.push(m));
  }

  /*
   * If anything matched the longer segment, only return those. Otherwise return only
   * the short form. For example, if the long form is "application/json" and short is "json",
   * prioritise matches form "application/json" if there were any.
   */
  const matches = allLongMatches.length ? allLongMatches : allShortMatches;
  const segment = allLongMatches.length ? nameSegmentLong : nameSegment;

  return {
    list: matches,
    from: CodeMirror.Pos(cur.line, cur.ch - segment.length),
    to: CodeMirror.Pos(cur.line, cur.ch)
  };
}

/**
 * Replace the text in the editor when a hint is selected.
 * This also makes sure there is whitespace surrounding it
 * @param cm
 * @param self
 * @param data
 */
function replaceHintMatch (cm, self, data) {
  const cur = cm.getCursor();
  const from = CodeMirror.Pos(cur.line, cur.ch - data.segment.length);
  const to = CodeMirror.Pos(cur.line, cur.ch);

  const prevStart = CodeMirror.Pos(from.line, from.ch - 10);
  const prevChars = cm.getRange(prevStart, from);

  const nextEnd = CodeMirror.Pos(to.line, to.ch + 10);
  const nextChars = cm.getRange(to, nextEnd);

  let prefix = '';
  let suffix = '';

  if (data.type === TYPE_VARIABLE && !prevChars.match(/{{[^}]*$/)) {
    prefix = '{{ '; // If no closer before
  } else if (data.type === TYPE_VARIABLE && prevChars.match(/{{$/)) {
    prefix = ' '; // If no space after opener
  } else if (data.type === TYPE_TAG && prevChars.match(/{%$/)) {
    prefix = ' '; // If no space after opener
  } else if (data.type === TYPE_TAG && !prevChars.match(/{%[^%]*$/)) {
    prefix = '{% '; // If no closer before
  }

  if (data.type === TYPE_VARIABLE && !nextChars.match(/^\s*}}/)) {
    suffix = ' }}'; // If no closer after
  } else if (data.type === TYPE_VARIABLE && nextChars.match(/^}}/)) {
    suffix = ' '; // If no space before closer
  } else if (data.type === TYPE_TAG && nextChars.match(/^%}/)) {
    suffix = ' '; // If no space before closer
  } else if (data.type === TYPE_TAG && nextChars.match(/^\s*}/)) {
    // Edge case because "%" doesn't auto-close tags so sometimes you end
    // up in the scenario of {% foo}
    suffix = ' %';
  } else if (data.type === TYPE_TAG && !nextChars.match(/^\s*%}/)) {
    suffix = ' %}'; // If no closer after
  }

  cm.replaceRange(`${prefix}${data.text}${suffix}`, from, to);
}

/**
 * Match against a list of things
 * @param listOfThings - Can be list of strings or list of {name, value}
 * @param segment - segment to match against
 * @param type
 * @param limit
 * @returns {Array}
 */
function matchSegments (listOfThings, segment, type, limit = -1) {
  const matches = [];

  for (const t of listOfThings) {
    const name = typeof t === 'string' ? t : t.name;
    const value = typeof t === 'string' ? '' : t.value;

    const matchSegment = segment.toLowerCase();
    const matchName = name.toLowerCase();

    // Throw away things that don't match
    if (!matchName.includes(matchSegment)) {
      continue;
    }

    matches.push({
      // Custom Insomnia keys
      type,
      segment,
      comment: value,
      displayValue: value ? JSON.stringify(value) : '',
      score: name.length, // In case we want to sort by this

      // CodeMirror
      text: name,
      displayText: name,
      render: renderHintMatch,
      hint: replaceHintMatch
    });
  }

  if (limit >= 0) {
    return matches.slice(0, limit);
  } else {
    return matches;
  }
}

/**
 * Replace all occurrences of string
 * @param text
 * @param find
 * @param prefix
 * @param suffix
 * @returns string
 */
function replaceWithSurround (text, find, prefix, suffix) {
  const escapedString = find.replace(ESCAPE_REGEX_MATCH, '\\$&');
  const re = new RegExp(escapedString, 'gi');
  return text.replace(re, matched => prefix + matched + suffix);
}

/**
 * Render the autocomplete list entry
 * @param li
 * @param self
 * @param data
 */
function renderHintMatch (li, self, data) {
  // Bold the matched text
  const {displayText, segment} = data;
  const markedName = replaceWithSurround(displayText, segment, '<strong>', '</strong>');

  li.innerHTML = `
    <label class="label">${ICONS[data.type]}</label>
    <div class="name">${markedName}</div>
    <div class="value" title=${data.displayValue}>
      ${data.displayValue}
    </div>
  `;

  li.className += ` type--${data.type}`;
}
