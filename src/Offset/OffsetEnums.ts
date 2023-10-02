export const JoinType = {
  Square: 0,
  Round: 1,
  Miter: 2,
  Bevel: 3,
} as const;
export type JoinType = (typeof JoinType)[keyof typeof JoinType];

export const EndType = {
  Polygon: 0,
  Joined: 1,
  Butt: 2,
  Square: 3,
  Round: 4,
} as const;
export type EndType = (typeof EndType)[keyof typeof EndType];
