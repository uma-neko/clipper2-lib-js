import { PointD } from "./PointD";

export type PathDBase = Iterable<Readonly<PointD>> & {
  readonly type: typeof PathDTypeName;
  push(...path: PointD[]): number;
  pushRange(path: Iterable<PointD>): number;
  clear(): void;
  clone(): PathDBase;
  pop(): PointD | undefined;
  getClone(index: number): PointD;
  get(index: number): PointD;
  getX(index: number): number;
  getY(index: number): number;
  set(index: number, x: number, y: number): void;
  readonly length: number;
};

export const PathDTypeName = "PathD";
