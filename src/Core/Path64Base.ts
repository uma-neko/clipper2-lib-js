import { Point64 } from "./Point64";

export const Path64TypeName = "Path64";

export type Path64Base = Iterable<Point64> & ArrayLike<Point64> & {
  readonly type: typeof Path64TypeName;
  push(...path: Point64[]): number;
  pushRange(path: Iterable<Point64>): number;
  clear(): void;
  pop():Point64 | undefined;
  readonly length:number;
}