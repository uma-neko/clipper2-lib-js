import { numberToBigInt } from "../Clipper";

export type Point64 = {
  x: bigint;
  y: bigint;
};

export const isPoint64 = (obj: Record<string, unknown>): obj is Point64 =>
  "x" in obj &&
  typeof obj.x === "bigint" &&
  "y" in obj &&
  typeof obj.y === "bigint";

export const Point64 = {
  equals: (a: Point64, b: Point64) => a.x === b.x && a.y === b.y,
  notEquals: (a: Point64, b: Point64) => a.x !== b.x || a.y !== b.y,
  clone: (origin: Point64): Point64 => ({ x: origin.x, y: origin.y }),
  createScaledPoint: (x: number, y: number, scale: number): Point64 => ({
    x: numberToBigInt(x * scale),
    y: numberToBigInt(y * scale),
  }),
  toString(pt: Point64): string {
    return `${pt.x}d,${pt.y}d `;
  },
} as const;
