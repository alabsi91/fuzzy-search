import { ReturnSearchInfo } from './types';

type Options = {
  openTag?: `<${string}>`;
  closeTag?: `</${string}>`;
  callback?: (highlighted: string, i: number) => unknown;
};

export function highlight<T extends string | object>(result: T & ReturnSearchInfo<T>, options?: Options) {
  if (options && options.callback) return highlightCallback(result, options.callback);
  const openTag = (options && options.openTag) ?? '<b>';
  const closeTag = (options && options.closeTag) ?? '</b>';

  const target = result._searchInfo.target;
  const targetLen = target.length;

  let highlighted = '';
  let matchesIndex = 0;
  let opened = false;
  let indexes = result._searchInfo.indexes;
  indexes = indexes.slice(0, indexes.len).sort((a, b) => a - b);

  for (let i = 0; i < targetLen; ++i) {
    const char = target[i];
    if (indexes[matchesIndex] === i) {
      ++matchesIndex;
      if (!opened) {
        opened = true;
        highlighted += openTag;
      }

      if (matchesIndex === indexes.length) {
        highlighted += char + closeTag + target.substring(i + 1);
        break;
      }
    } else {
      if (opened) {
        opened = false;
        highlighted += closeTag;
      }
    }

    highlighted += char;
  }

  return highlighted;
}

export function highlightCallback<T>(result: ReturnSearchInfo<string | object>, cb: (highlighted: string, i: number) => T) {
  const target = result._searchInfo.target;
  const targetLen = target.length;
  const results = [];

  let indexes = result._searchInfo.indexes;
  indexes = indexes.slice(0, indexes.len).sort((a, b) => a - b);
  let highlighted = '';
  let matchI = 0;
  let indexesI = 0;
  let opened = false;

  for (let i = 0; i < targetLen; ++i) {
    const char = target[i];
    if (indexes[indexesI] === i) {
      ++indexesI;
      if (!opened) {
        opened = true;
        results.push(highlighted);
        highlighted = '';
      }

      if (indexesI === indexes.length) {
        highlighted += char;
        results.push(cb(highlighted, matchI++));
        highlighted = '';
        results.push(target.substring(i + 1));
        break;
      }
    } else {
      if (opened) {
        opened = false;
        results.push(cb(highlighted, matchI++));
        highlighted = '';
      }
    }

    highlighted += char;
  }

  return results;
}
