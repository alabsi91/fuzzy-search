import { ReturnSearchInfo } from './types';

export { go, single } from './fuzzy';
export { highlight } from './highlight';
export { charactersMap } from './store';
export { transformationFn } from './utils';

export * from './types';

/**
 * - For `HTML` import `highlight` from `'fuzzy-search'`
 * - For `React` import `HighlightReact` from `'fuzzy-search/react'`
 * - For `React-Native` import `HighlightReact` from `'fuzzy-search'`
 * @param result - Search result object
 * @param HighlightedTextCP - Highlighted text component
 * @param RegularTextCP - Regular text component
 * @returns - Returns an array of JSX elements
 */
export declare function HighlightReact<T extends string | object>(
  result: T & ReturnSearchInfo<T>,
  HighlightedTextCP: React.FC<{
    text: string;
  }>,
  RegularTextCP?: React.FC<{
    text: string;
  }>
): React.JSX.Element[];