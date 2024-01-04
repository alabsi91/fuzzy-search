import { algorithm, createFastPriorityQueue } from './algorithms';
import { cleanupSearchInfoInObject, getPreparedSearch, getPreparedTarget, getValue } from './utils';

import type {
  ObjectKeyPaths,
  ObjectWithSearchInfo,
  Options,
  OptionsStringArray,
  OptionsWithKeys,
  PreparedTargetInfo,
  ReturnObjectArray,
  ReturnSearchInfo,
  ReturnStringArray,
} from './types';

const INT_MAX = Infinity;
const INT_MIN = -INT_MAX;

const queue = createFastPriorityQueue();

/**
 * Executes the fuzzy search algorithm.
 *
 * @param search - The search string.
 * @param targets - The array of targets (strings or objects).
 * @param options - Additional options for the search.
 * @returns - Result of the fuzzy search algorithm.
 */
export function search<T extends string>(search: string, targets: T[], options?: OptionsStringArray<T>): ReturnStringArray<T>[];
export function search<T extends object>(search: string, targets: T[], options?: OptionsWithKeys<T>): ReturnObjectArray<T>[];
export function search<T extends string | object>(search: string, targets: T[], options?: Options<T>): ReturnSearchInfo<T>[] {
  const transformationFn = (options && options.transformationFn) || ((str: string) => str);
  search = transformationFn(search);

  const preparedSearch = getPreparedSearch(search);
  const searchBitflags = preparedSearch.bitflags;

  const threshold = (options && options.threshold) || -10000;
  const limit = (options && options.limit) || INT_MAX;

  const targetsLen = targets.length;
  let resultsLen = 0;

  // Options with a single key
  if (options && options.key) {
    const key = options.key as ObjectKeyPaths<T>;

    for (let i = 0; i < targetsLen; ++i) {
      const obj = targets[i];
      if (typeof obj !== 'object') continue;

      cleanupSearchInfoInObject(obj); // remove _searchInfo if it exists from previous search

      const target = getValue(obj, key);
      if (!target) continue;

      const preparedTarget = getPreparedTarget(transformationFn(target));

      if ((searchBitflags & preparedTarget.bitflags) !== searchBitflags) continue;

      const result = algorithm(preparedSearch, preparedTarget);

      if (result === null || result.score < threshold) continue;

      result.target = target; // original target (not transformationFn-ed)

      const objectWithSearchInfo = obj as ObjectWithSearchInfo;
      result.key = key;
      objectWithSearchInfo._searchInfo = result;

      if (resultsLen < limit) {
        queue.add(objectWithSearchInfo);
        ++resultsLen;
      } else {
        const highestPriority = queue.peek<ObjectWithSearchInfo>();
        if (highestPriority && result.score > highestPriority._searchInfo.score) queue.replaceTop(objectWithSearchInfo);
      }
    }
  }

  // Options with multiple keys
  else if (options && options.keys) {
    const scoreFn = options.scoreFn || defaultScoreFn;
    const keys = options.keys as ObjectKeyPaths<T>;
    const keysLen = keys.length;

    for (let i = 0; i < targetsLen; ++i) {
      const obj = targets[i];
      if (typeof obj !== 'object') continue;

      cleanupSearchInfoInObject(obj); // remove _searchInfo if it exists from previous search

      const objResults = new Array(keysLen) as (PreparedTargetInfo | null)[];

      for (let keyI = 0; keyI < keysLen; ++keyI) {
        const key = keys[keyI];
        const target = getValue(obj, key);

        if (!target) {
          objResults[keyI] = null;
          continue;
        }

        const preparedTarget = getPreparedTarget(transformationFn(target));

        if ((searchBitflags & preparedTarget.bitflags) !== searchBitflags) {
          objResults[keyI] = null;
        } else {
          const result = algorithm(preparedSearch, preparedTarget);
          if (result) {
            result.key = key;
            result.target = target; // original target (not transformationFn-ed)
          }
          objResults[keyI] = result;
        }
      }

      const score = scoreFn(objResults);
      if (score === null || score < threshold) continue;

      const _searchInfo = objResults.filter(r => r !== null && r.score === score)[0]!;

      const objectWithSearchInfo = obj as ObjectWithSearchInfo;
      objectWithSearchInfo._searchInfo = _searchInfo;

      if (resultsLen < limit) {
        queue.add(objectWithSearchInfo);
        ++resultsLen;
      } else {
        const highestPriority = queue.peek<ObjectWithSearchInfo>();
        if (highestPriority && score > highestPriority._searchInfo.score) {
          queue.replaceTop(objectWithSearchInfo);
        }
      }
    }
  }

  // Options without keys
  else {
    for (let i = 0; i < targetsLen; ++i) {
      const target = targets[i] as string & T;
      if (!target || typeof target !== 'string') continue;

      const preparedTarget = getPreparedTarget(transformationFn(target));

      if ((searchBitflags & preparedTarget.bitflags) !== searchBitflags) continue;
      const result = algorithm(preparedSearch, preparedTarget);

      if (result === null || result.score < threshold) continue;
      result.target = target; // original target (not transformationFn-ed)

      const obj = { string: target, _searchInfo: result };

      if (resultsLen < limit) {
        queue.add(obj);
        ++resultsLen;
      } else {
        const highestPriority = queue.peek<typeof obj>();
        if (highestPriority && obj._searchInfo.score > highestPriority._searchInfo.score) {
          queue.replaceTop(obj);
        }
      }
    }
  }

  if (resultsLen === 0) return [];
  const results = new Array(resultsLen) as ReturnSearchInfo<T>[];
  for (let i = resultsLen - 1; i >= 0; --i) {
    const result = queue.poll<ReturnSearchInfo<T>>();
    if (result) results[i] = result;
  }

  return results;
}

// for use with keys. just returns the maximum score
function defaultScoreFn(a: (PreparedTargetInfo | null)[]): number | null {
  let max = INT_MIN;

  for (let i = 0; i < a.length; ++i) {
    const result = a[i];
    if (result === null) continue;
    const score = result.score;
    if (score > max) max = score;
  }

  if (max === INT_MIN) return null;

  return max;
}

/** - Get score and search information on a single string */
export function single(search: string, target: string, transformationFn = (str: string) => str): PreparedTargetInfo | null {
  if (!search || !target || typeof search !== 'string' || typeof target !== 'string') return null;

  search = transformationFn(search);

  const preparedSearch = getPreparedSearch(search);
  const preparedTarget = getPreparedTarget(transformationFn(target));

  const searchBitflags = preparedSearch.bitflags;
  if ((searchBitflags & preparedTarget.bitflags) !== searchBitflags) return null;

  const result = algorithm(preparedSearch, preparedTarget);
  preparedTarget.target = target; // original target (not transformationFn-ed)

  return result;
}
