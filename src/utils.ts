import { charactersMap, preparedCache, preparedSearchCache } from './store';
import type { PreparedSearch, PreparedTargetInfo, ReturnObjectArray, SpaceSearches } from './types';

/**
 * Gets the value from an object using a property string or an array of keys.
 *
 * @param obj - The object to retrieve the value from.
 * @param prop - The property string key or string of key paths E.g 'key1.key2'
 * @returns The value associated with the specified property or undefined if not found.
 */
export function getValue<T extends object>(obj: T, prop: string): string | null {
  const keys = prop.split('.') as (keyof T)[];

  let value = obj[keys[0]];
  const len = keys.length;
  let i = 0;
  while (value && ++i < len) {
    const key = keys[i];
    value = (value as never)[key];
  }

  return typeof value === 'string' ? value : null;
}

/**
 * Prepares lowercased information about a given string.
 *
 * @param - The input string.
 * @returns - An object containing lowerCodes array, bitflags, containsSpace flag, and _lower (lowercased string).
 */
export function prepareLowerInfo(str: string): Omit<PreparedSearch, 'spaceSearches'> {
  const strLen = str.length;
  const lower = str.toLowerCase();

  const lowerCodes: number[] = []; // to store ASCII codes of the lowercase characters

  let containsSpace = false; // space isn't stored in bitflags because of how searching with a space works
  let bitflags = 0;

  // Iterate over each character in the lowercase string
  for (let i = 0; i < strLen; ++i) {
    // Get the ASCII code of the current character
    const lowerCode = (lowerCodes[i] = lower.charCodeAt(i));

    // Check if the character is a space
    if (lowerCode === 32) {
      containsSpace = true;
      continue; // It's important that we don't set any bitflags for space
    }

    // Calculate bit based on the character type
    const bit =
      lowerCode >= 97 && lowerCode <= 122
        ? lowerCode - 97 // Alphabet
        : lowerCode >= 48 && lowerCode <= 57
          ? 26 // Numbers
          : // 3 bits available
            lowerCode <= 127
            ? 30 // Other ASCII
            : 31; // Other UTF-8

    // Set the corresponding bit in the bitflags
    bitflags |= 1 << bit;
  }

  return {
    lowerCodes,
    bitflags,
    containsSpace,
    lower,
  };
}

/**
 * Prepares an array of indexes representing the beginning positions of words in a target string.
 *
 * @param target - The target string.
 * @returns - An array of indexes representing the beginning positions of words.
 */
export function prepareBeginningIndexes(target: string): number[] {
  const targetLen = target.length;
  const beginningIndexes: number[] = [];

  let beginningIndexesLen = 0;
  let wasUpper = false;
  let wasAlphaNum = false;

  // Iterate through each character in the target string
  for (let i = 0; i < targetLen; ++i) {
    const targetCode = target.charCodeAt(i); // Get the ASCII code of the current character

    // Check if the character is an uppercase letter
    const isUpper = targetCode >= 65 && targetCode <= 90;

    // Check if the character is an alphanumeric character
    const isAlphaNum = isUpper || (targetCode >= 97 && targetCode <= 122) || (targetCode >= 48 && targetCode <= 57);

    // Check if the current character is the beginning of a word
    const isBeginning = (isUpper && !wasUpper) || !wasAlphaNum || !isAlphaNum;

    // Update the state variables for the next iteration
    wasUpper = isUpper;
    wasAlphaNum = isAlphaNum;

    // If it's the beginning of a word, add the index to the array
    if (isBeginning) beginningIndexes[beginningIndexesLen++] = i;
  }

  // Return the array of beginning indexes
  return beginningIndexes;
}

/**
 * Prepares an array of indexes representing the beginning positions of the next words in a target string.
 *
 * @param target - The target string.
 * @returns - An array of indexes representing the beginning positions of the next words.
 */
export function prepareNextBeginningIndexes(target: string): number[] {
  const targetLen = target.length;

  // Get the array of beginning indexes for the target string
  const beginningIndexes = prepareBeginningIndexes(target);
  const nextBeginningIndexes: number[] = [];

  let lastIsBeginning = beginningIndexes[0];
  let lastIsBeginningI = 0;

  for (let i = 0; i < targetLen; ++i) {
    // If the lastIsBeginning index is greater than the current index,
    // use the lastIsBeginning index for the current position and continue
    if (lastIsBeginning > i) {
      nextBeginningIndexes[i] = lastIsBeginning;
      continue;
    }

    // Update lastIsBeginning and lastIsBeginningI for the next iteration
    lastIsBeginning = beginningIndexes[++lastIsBeginningI];

    // Set the nextBeginningIndexes value for the current position
    nextBeginningIndexes[i] = lastIsBeginning === undefined ? targetLen : lastIsBeginning;
  }

  return nextBeginningIndexes;
}

/**
 * Prepares search information including lowercased data and space-separated searches.
 *
 * @param {string} search - The search string.
 * @returns - Object containing lowercased data, bitflags, space information, and an array of space-separated searches.
 */
export function prepareSearch(search: string): PreparedSearch {
  if (typeof search !== 'string') search = '';
  search = search.trim();

  const info = prepareLowerInfo(search);
  const spaceSearches: SpaceSearches[] = [];

  if (info.containsSpace) {
    let searches = search.split(/\s+/);

    searches = [...new Set(searches)]; // Remove duplicate searches while maintaining order

    // Iterate through each space-separated search
    for (let i = 0; i < searches.length; i++) {
      if (searches[i] === '') continue;

      // Prepare lowercased information for the current space-separated search
      const _info = prepareLowerInfo(searches[i]);

      // Add information about the space-separated search to the array
      spaceSearches.push({
        lowerCodes: _info.lowerCodes,
        lower: searches[i].toLowerCase(),
        containsSpace: false,
      });
    }
  }

  return {
    lowerCodes: info.lowerCodes,
    bitflags: info.bitflags,
    containsSpace: info.containsSpace,
    lower: info.lower,
    spaceSearches,
  };
}

/**
 * Gets prepared search information, either from cache or by preparing it and caching it.
 *
 * @param {string} search - The search string.
 * @returns {Prepared} Prepared search information.
 */
export function getPreparedSearch(search: string): PreparedSearch {
  // Don't cache huge searches
  if (search.length > 999) return prepareSearch(search);

  // Attempt to retrieve prepared search information from cache
  const searchPrepared = preparedSearchCache.get(search);

  // If the search is found in cache, return the cached result
  if (searchPrepared !== undefined) return searchPrepared;

  // Prepare search information and cache the result
  const newSearchPrepared = prepareSearch(search);
  preparedSearchCache.set(search, newSearchPrepared);

  // Return the newly prepared search information
  return newSearchPrepared;
}

/**
 * Prepares information for a target string, including lowercased data and other properties.
 *
 * @param target - The target string.
 * @returns - Prepared information for the target string.
 */
function prepareTarget(target: string): PreparedTargetInfo {
  if (typeof target !== 'string') target = '';

  const info = prepareLowerInfo(target);

  return {
    target,
    targetLower: info.lower,
    targetLowerCodes: info.lowerCodes,
    nextBeginningIndexes: null,
    bitflags: info.bitflags,
    score: 0,
    indexes: [0],
  }; // hidden
}

/**
 * Gets prepared information for a target string, either from cache or by preparing it and caching it.
 *
 * @param target - The target string.
 * @returns - Prepared information for the target string.
 */
export function getPreparedTarget(target: string): PreparedTargetInfo {
  // Don't cache huge targets
  if (target.length > 999) return prepareTarget(target);

  // Attempt to retrieve prepared information from cache
  const targetPrepared = preparedCache.get(target);

  // If the target is found in cache, return the cached result
  if (targetPrepared !== undefined) return targetPrepared;

  // Prepare information and cache the result
  const newTargetPrepared = prepareTarget(target);
  preparedCache.set(target, newTargetPrepared);

  // Return the newly prepared information
  return newTargetPrepared;
}

/**
 * replaces any characters in the string that match the keys in the `charactersMap`
 * with their corresponding values, returning the normalized string.
 * @param str - represents the input text that needs to be transformed.
 * @returns a normalized version of the input string.
 */
export function transformationFn(str: string): string {
  const re = new RegExp('[' + Array.from(charactersMap.keys()).join('') + ']', 'g');
  return str.replace(re, match => charactersMap.get(match) || match);
}

/**
 * Removes the _searchInfo property from an object.
 * After using the object in highlight, you should call cleanupSearchInfo(object) to clean up.
 */
export function cleanupSearchInfo<T extends object>(obj: T & ReturnObjectArray<T>): Omit<T, '_searchInfo'> {
  // @ts-expect-error _searchInfo should be optional
  delete obj._searchInfo;
  return obj as Omit<T, '_searchInfo'>;
}
