import { PointD } from "./PointD";


export type PathDBase = Iterable<PointD> & ArrayLike<PointD> & {
  readonly type: typeof PathDTypeName;
  push(...path: PointD[]): number;
  pushRange(path: Iterable<PointD>): number;
  clear(): void;
  pop(): PointD | undefined;
  readonly length: number;
};

export const PathDTypeName = "PathD";
