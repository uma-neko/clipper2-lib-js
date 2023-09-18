export const FillRule = {
  EvenOdd: 0,
  NonZero: 1,
  Positive: 2,
  Negative: 3,
} as const;

export type FillRule = (typeof FillRule)[keyof typeof FillRule];

export const ClipType = {
  None: 0,
  Intersection: 1,
  Union: 2,
  Difference: 3,
  Xor: 4,
} as const;

export type ClipType = (typeof ClipType)[keyof typeof ClipType];

export const PathType = {
  Subject: 1,
  Clip: 2,
} as const;

export type PathType = (typeof PathType)[keyof typeof PathType];

export const PipResult = {
  Inside: 1,
  Outside: 2,
  OnEdge: 3,
} as const;

export type PipResult = (typeof PipResult)[keyof typeof PipResult];
