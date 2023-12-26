import { matchesSimple, matchesStrict } from './store';
import { PreparedSearch, PreparedTargetInfo, SpaceSearches } from './types';
import { prepareNextBeginningIndexes } from './utils';

/**
 * Creates a fast priority queue data structure with number scores.
 * Hacked version of https://github.com/lemire/FastPriorityQueue.js
 */
export function createFastPriorityQueue() {
  // Define a type for numbers with a score property
  type ItemWithScore = unknown & { _searchInfo: PreparedTargetInfo };

  // Initialize the array to store items with scores
  const items: ItemWithScore[] = [];

  // Initialize the size of the queue
  let queueSize = 0;

  // Helper function to maintain the heap property (min-heap)
  const heapify = () => {
    let currentIndex = 0;
    const currentItem = items[currentIndex];

    // Heapify down: Move the smaller child up until the heap property is satisfied
    for (let childIndex = 1; childIndex < queueSize; ) {
      const nextChildIndex = childIndex + 1;
      currentIndex = childIndex;
      if (nextChildIndex < queueSize && items[nextChildIndex]._searchInfo.score < items[childIndex]._searchInfo.score)
        currentIndex = nextChildIndex;
      items[(currentIndex - 1) >> 1] = items[currentIndex];
      childIndex = 1 + (currentIndex << 1);
    }

    // Heapify up: Move the current item up until the heap property is satisfied
    for (
      let parentIndex = (currentIndex - 1) >> 1;
      currentIndex > 0 && currentItem._searchInfo.score < items[parentIndex]._searchInfo.score;
      parentIndex = ((currentIndex = parentIndex) - 1) >> 1
    ) {
      items[currentIndex] = items[parentIndex];
    }

    items[currentIndex] = currentItem;
  };

  // Define the priority queue methods
  return {
    /** - Add an item to the priority queue */
    add(item: ItemWithScore) {
      let currentIndex = queueSize;
      items[queueSize++] = item;

      // Heapify up: Move the current item up until the heap property is satisfied
      for (
        let parentIndex = (currentIndex - 1) >> 1;
        currentIndex > 0 && item._searchInfo.score < items[parentIndex]._searchInfo.score;
        parentIndex = ((currentIndex = parentIndex) - 1) >> 1
      ) {
        items[currentIndex] = items[parentIndex];
      }

      items[currentIndex] = item;
    },
    /** - Poll (remove and return) the item with the highest priority */
    poll<T = ItemWithScore>() {
      if (queueSize === 0) return;
      var topItem = items[0];
      items[0] = items[--queueSize];
      heapify(); // Heapify down
      return topItem as T;
    },
    /** - Peek (return without removing) the item with the highest priority */
    peek<T = ItemWithScore>() {
      if (queueSize !== 0) return items[0] as T;
    },
    /** - Replace the item with the highest priority (top of the heap) */
    replaceTop(item: ItemWithScore) {
      items[0] = item;
      heapify(); // Heapify down
    },
  };
}
/**
 * Executes the fuzzy search algorithm.
 *
 * @param preparedSearch - Prepared search information.
 * @param preparedTarget - Prepared target information.
 * @param allowSpaces - Flag to allow space-separated searches.
 * @returns - Result of the fuzzy search algorithm.
 */
export function algorithm(
  preparedSearch: PreparedSearch | SpaceSearches,
  preparedTarget: PreparedTargetInfo,
  allowSpaces = false
): PreparedTargetInfo | null {
  // Check if space-separated searches are allowed and the search contains spaces
  if (allowSpaces === false && 'spaceSearches' in preparedSearch && preparedSearch.containsSpace) {
    return algorithmSpaces(preparedSearch, preparedTarget);
  }

  // Extract relevant information from the preparedSearch and prepared objects
  const searchLower = preparedSearch.lower;
  const searchLowerCodes = preparedSearch.lowerCodes;
  let searchLowerCode = searchLowerCodes[0];
  const targetLowerCodes = preparedTarget.targetLowerCodes;
  const searchLen = searchLowerCodes.length;
  const targetLen = targetLowerCodes.length ?? 0;
  let searchI = 0; // Index for the search string
  let targetI = 0; // Index for the target string
  let matchesSimpleLen = 0;

  // Very basic fuzzy match to remove non-matching targets ASAP
  // walk through target. find sequential matches.
  // if all chars aren't found then exit
  for (;;) {
    const isMatch = searchLowerCode === targetLowerCodes[targetI];
    if (isMatch) {
      matchesSimple[matchesSimpleLen++] = targetI;
      ++searchI;
      if (searchI === searchLen) break;
      searchLowerCode = searchLowerCodes[searchI];
    }
    ++targetI;
    if (targetI >= targetLen) return null; // Failed to find searchI
  }

  searchI = 0;
  let successStrict = false;
  let matchesStrictLen = 0;

  let nextBeginningIndexes = preparedTarget.nextBeginningIndexes;
  if (nextBeginningIndexes === null) {
    nextBeginningIndexes = preparedTarget.nextBeginningIndexes = prepareNextBeginningIndexes(preparedTarget.target);
  }

  targetI = matchesSimple[0] === 0 ? 0 : nextBeginningIndexes[matchesSimple[0] - 1];

  // More advanced and strict test for a successful match
  let backtrackCount = 0;
  if (targetI !== targetLen)
    for (;;) {
      if (targetI >= targetLen) {
        if (searchI <= 0) break; // Failed to push chars forward for a better match

        ++backtrackCount;
        if (backtrackCount > 200) break; // Give up and return a bad match for long backtracking

        --searchI;
        const lastMatch = matchesStrict[--matchesStrictLen];
        targetI = nextBeginningIndexes[lastMatch];
      } else {
        const isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI];
        if (isMatch) {
          matchesStrict[matchesStrictLen++] = targetI;
          ++searchI;
          if (searchI === searchLen) {
            successStrict = true;
            break;
          }
          ++targetI;
        } else {
          targetI = nextBeginningIndexes[targetI];
        }
      }
    }

  // Check if it's a substring match
  const substringIndex = preparedTarget.targetLower.indexOf(searchLower, matchesSimple[0]);
  const isSubstring = ~substringIndex;

  // Rewrite the indexes from basic to the substring
  if (isSubstring && !successStrict) {
    // rewrite the indexes from basic to the substring
    for (let i = 0; i < matchesSimpleLen; ++i) {
      matchesSimple[i] = substringIndex + i;
    }
  }

  let isSubstringBeginning = false;
  if (isSubstring) {
    isSubstringBeginning = preparedTarget.nextBeginningIndexes?.[substringIndex - 1] === substringIndex;
  }

  // Tally up the score & keep track of matches for highlighting later
  const matchesBest = successStrict ? matchesStrict : matchesSimple;
  const matchesBestLen = successStrict ? matchesStrictLen : matchesSimpleLen;
  let score = 0;

  let extraMatchGroupCount = 0;
  for (let i = 1; i < searchLen; ++i) {
    if (matchesBest[i] - matchesBest[i - 1] !== 1) {
      score -= matchesBest[i];
      ++extraMatchGroupCount;
    }
  }
  const unmatchedDistance = matchesBest[searchLen - 1] - matchesBest[0] - (searchLen - 1);

  // penalty for more groups
  score -= (12 + unmatchedDistance) * extraMatchGroupCount;

  // penalty for not starting near the beginning
  if (matchesBest[0] !== 0) score -= matchesBest[0] * matchesBest[0] * 0.2;

  if (!successStrict) {
    score *= 1000;
  } else {
    // successStrict on a target with too many beginning indexes loses points for being a bad target
    let uniqueBeginningIndexes = 1;
    for (let i = nextBeginningIndexes[0]; i < targetLen; i = nextBeginningIndexes![i]) {
      ++uniqueBeginningIndexes;
    }

    // quite arbitrary numbers here ...
    if (uniqueBeginningIndexes > 24) score *= (uniqueBeginningIndexes - 24) * 10;
  }

  if (isSubstring) score /= 1 + searchLen * searchLen * 1;
  if (isSubstringBeginning) score /= 1 + searchLen * searchLen * 1;

  // penalty for longer targets
  score -= targetLen - searchLen;

  preparedTarget.score = score;

  for (let i = 0; i < matchesBestLen; ++i) {
    preparedTarget.indexes[i] = matchesBest[i];
  }
  preparedTarget.indexes.len = matchesBestLen;

  return preparedTarget;
}

/**
 * Executes the fuzzy search algorithm with space-separated searches.
 *
 * @param preparedSearch - Prepared search information.
 * @param target - Target string for the search.
 * @returns - Result of the fuzzy search algorithm with spaces.
 */
export function algorithmSpaces(preparedSearch: PreparedSearch, target: PreparedTargetInfo): PreparedTargetInfo | null {
  const seenIndexes = new Set<number>();
  let score = 0;
  let result: PreparedTargetInfo | null = null;

  let firstSeenIndexLastSearch = 0;
  const searches = preparedSearch.spaceSearches;

  for (let i = 0; i < searches.length; ++i) {
    const search = searches[i];

    result = algorithm(search, target);
    if (result === null) return null;

    score += result.score ?? 0;

    if (result.indexes[0] < firstSeenIndexLastSearch) {
      score -= firstSeenIndexLastSearch - result.indexes[0];
    }
    firstSeenIndexLastSearch = result.indexes[0];

    for (let j = 0; j < result.indexes!.len!; ++j) {
      seenIndexes.add(result.indexes[j]);
    }
  }

  if (result === null) return null; // not necessary, just for typescript

  const allowSpacesResult = algorithm(preparedSearch, target, true);
  if (allowSpacesResult !== null && allowSpacesResult.score > score) {
    return allowSpacesResult;
  }

  result.score = score;

  let i = 0;
  for (const index of seenIndexes) {
    result.indexes[i++] = index;
  }
  result.indexes.len = i;

  return result;
}
