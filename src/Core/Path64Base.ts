import { Point64 } from "./Point64";

export const Path64TypeName = Symbol("Path64");

export type Path64Base = Iterable<Readonly<Point64>> & {
  readonly type: typeof Path64TypeName;
  push(...path: Point64[]): number;
  pushRange(path: Iterable<Point64>): number;
  clear(): void;
  clone(): Path64Base;
  pop(): Point64 | undefined;
  getClone(index: number): Point64;
  get(index: number): Point64;
  set(index: number, x: bigint, y: bigint): void;
  getClones(): IterableIterator<Point64>;
  readonly length: number;
};
