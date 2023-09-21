import { PathD } from "./PathD";
import { PointD } from "./PointD";

export const isPathsD = (obj: unknown): obj is PathsD => {
  return obj instanceof PathsD && obj.type === PathsDTypeName;
};

export const PathsDTypeName = "PathsD";

export class PathsD extends Array<PathD> {
  readonly type: typeof PathsDTypeName;

  constructor();
  constructor(...paths: Iterable<PointD>[]);
  constructor(arrayLength: number);

  constructor(...args: Iterable<PointD>[] | [number]) {
    if (args.length === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      this.push(...args as Iterable<PointD>[]);
    }
    this.type = PathsDTypeName;
  }

  clear() {
    for (const path of this) {
      path.length = 0;
    }
    this.length = 0;
  }

  override push(...paths: Iterable<PointD>[]) {
    for (const path of paths) {
      super.push(new PathD(...path));
    }
    return this.length;
  }
}
