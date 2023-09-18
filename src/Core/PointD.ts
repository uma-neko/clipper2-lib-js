import { isAlmostZero } from "./InternalClipper";

export type PointD = {
  x: number;
  y: number;
};

export const isPointD = (obj: Record<string, unknown>): obj is PointD =>
  "x" in obj &&
  typeof obj.x === "number" &&
  "y" in obj &&
  typeof obj.y === "number";

export const PointD = {
  equals: (a: PointD, b: PointD) =>
    isAlmostZero(a.x - b.x) && isAlmostZero(a.y - b.y),
  notEquals: (a: PointD, b: PointD) =>
    !isAlmostZero(a.x - b.x) || !isAlmostZero(a.y - b.y),
  clone: (origin: PointD): PointD => ({ x: origin.x, y: origin.y }),
  toString(pt: PointD, precision: number = 2): string {
    return `${pt.x.toFixed(precision)},${pt.y.toFixed(precision)} `;
  },
};
