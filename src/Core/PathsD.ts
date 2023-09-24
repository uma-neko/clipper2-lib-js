import { PathD, isPathD } from "./PathD";
import { PathDBase } from "./PathDBase";
import { PointD } from "./PointD";

export const isPathsD = (obj: unknown): obj is PathsD => {
  return obj instanceof PathsD && obj.type === PathsDTypeName;
};

export const PathsDTypeName = "PathsD";

export class PathsD extends Array<PathDBase> {
  readonly type: typeof PathsDTypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: PathDBase[]);
  constructor(...args: [] | [number] | PathDBase[]);
  constructor(...args: [] | [number] | PathDBase[]) {
    const len = args.length;
    if (len === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      for (const path of args) {
        if (isPathD(path)) {
          this.push(path);
        } else {
          throw Error("todo: change message");
        }
      }
    }
    this.type = PathsDTypeName;
  }

  static clone(paths: Iterable<Iterable<PointD>>): PathsD {
    const result = new PathsD();
    result.pushRange(paths);
    return result;
  }

  clear() {
    if (this.length !== 0) {
      for (const path of this) {
        path.clear();
      }
      this.length = 0;
    }
  }

  override push(...paths: Iterable<PointD>[]) {
    for (const path of paths) {
      super.push(PathD.clone(path));
    }
    return this.length;
  }

  pushRange(paths: Iterable<Iterable<PointD>>) {
    for (const path of paths) {
      super.push(PathD.clone(path));
    }
    return this.length;
  }
}
