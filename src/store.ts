import type { PreparedSearch, PreparedTargetInfo } from './types';

export const preparedSearchCache = new Map<string, PreparedSearch>();
export const preparedCache = new Map<string, PreparedTargetInfo>();
export let matchesSimple: number[] = [];
export let matchesStrict: number[] = [];

export function cleanupSearchCache() {
  preparedCache.clear();
  preparedSearchCache.clear();
  matchesSimple = [];
  matchesStrict = [];
}

export const charactersMap = new Map<string, string>([
  // Arabic
  ['أ', 'ا'],
  ['إ', 'ا'],
  ['آ', 'ا'],
  ['ذ', 'ز'],
  ['ئ', 'ي'],
  ['ة', 'ه'],
  // Turkish
  ['ç', 'c'],
  ['Ç', 'C'],
  ['ş', 's'],
  ['Ş', 'S'],
  ['ı', 'i'],
  // ['İ', 'I'],
  ['ö', 'o'],
  ['Ö', 'O'],
  ['ü', 'u'],
  ['Ü', 'U'],
  ['ğ', 'g'],
  ['Ğ', 'G'],
  // French
  // ['é', 'e'],
  // ['É', 'E'],
  // ['è', 'e'],
  // ['È', 'E'],
  // ['ê', 'e'],
  // ['Ê', 'E'],
  // ['à', 'a'],
  // ['À', 'A'],
  // ['î', 'i'],
  // ['Î', 'I'],
  // ['ô', 'o'],
  // ['Ô', 'O'],
  // // German
  // ['ä', 'a'],
  // ['Ä', 'A'],
  // ['ß', 'ss'],
]);
