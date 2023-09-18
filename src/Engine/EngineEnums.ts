export const PointInPolygonResult = {
  IsOn: 0,
  IsInside: 1,
  IsOutside: 2,
} as const;
export type PointInPolygonResult = number;

export const VertexFlags = {
  None: 0,
  OpenStart: 1,
  OpenEnd: 2,
  LocalMax: 4,
  LocalMin: 8,
} as const;
export type VertexFlags = number;

export const JoinWith = {
  None: 0,
  Left: 1,
  Right: 2,
} as const;
export type JoinWith = (typeof JoinWith)[keyof typeof JoinWith];

export const HorzPosition = {
  Bottom: 1,
  Middle: 2,
  Top: 3,
} as const;
export type HorzPosition = (typeof HorzPosition)[keyof typeof HorzPosition];
