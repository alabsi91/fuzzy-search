export type SpaceSearches = { lowerCodes: number[]; lower: string; containsSpace: boolean };

export type PreparedSearch = {
  lowerCodes: number[];
  bitflags: number;
  containsSpace: boolean;
  lower: string;
  spaceSearches: SpaceSearches[];
};

export type PreparedTargetInfo<T = string> = {
  target: string;
  targetLower: string;
  targetLowerCodes: number[];
  nextBeginningIndexes: number[] | null;
  bitflags: number;
  /** exact match returns a score of 0. lower is worse */
  score: number;
  key?: T;
  indexes: number[] & { len?: number };
};

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

export type ObjectKeyPaths<T> = T extends Date | Array<unknown>
  ? ''
  : (
        T extends object
          ? { [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<ObjectKeyPaths<T[K]>>}` }[Exclude<keyof T, symbol>]
          : ''
      ) extends infer D
    ? Extract<D, string>
    : never;

export type Options<T extends string | object> = {
  /** - Custom string transformation function to apply to input search and targets. */
  transformationFn?: (str: string) => string;
  /** - Custom score function, only used when `options.keys` is provided. */
  scoreFn?: (a: (PreparedTargetInfo | null)[]) => number;
  /**
   * - Minimum score to return results.
   * - Exact match returns a score of 0. lower is worse.
   * - Use `-10000` to eliminate results with bad scores.
   * - Use `-Infinity` to return results with any score.
   * 
   * **Default:** `-10000`
   */
  threshold?: number;
  /** 
   * - Limit the number of results .
   * 
   * **Default:** `Infinity`
   */
  limit?: number;
  key?: T extends string ? never : ObjectKeyPaths<T>;
  keys?: T extends string ? never : ObjectKeyPaths<T>[];
};

export type OptionsStringArray<T extends string> = Options<T> & {
  scoreFn?: never;
  key?: never;
  keys?: never;
};

export type OptionsWithSingleKey<T extends object> = Options<T> & {
  key: ObjectKeyPaths<T>;
  scoreFn?: never;
};

export type OptionsWithMultipleKeys<T extends object> = Options<T> & {
  keys: ObjectKeyPaths<T>[];
};

export type OptionsWithKeys<T extends object> = OptionsWithSingleKey<T> | OptionsWithMultipleKeys<T>;

export type ReturnStringArray<T> = { string: T; _searchInfo: PreparedTargetInfo<never> };
export type ReturnObjectArray<T> = T & { _searchInfo: PreparedTargetInfo<ObjectKeyPaths<T>> };

export type ReturnSearchInfo<T> =
  // the target is an array of strings with no kye nor keys option
  | ReturnStringArray<T>
  // the target is an array of objects with key/s option
  | ReturnObjectArray<T>;

export type ObjectWithSearchInfo = object & { _searchInfo: PreparedTargetInfo };
