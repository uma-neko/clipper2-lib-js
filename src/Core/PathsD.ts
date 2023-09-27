import { isPathD } from "./PathD";
import { PathDBase } from "./PathDBase";
import { PathDTypedArray } from "./PathDTypedArray";
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
        this._push(path as PathDBase);
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

  _push(path: Iterable<PointD>) {
    let clonedPath: PathDBase;
    if (isPathD(path)) {
      clonedPath = path.clone();
    } else {
      if (
        "length" in path &&
        typeof path.length === "number" &&
        path.length > 0
      ) {
        clonedPath = new PathDTypedArray(path.length);
      } else {
        clonedPath = new PathDTypedArray();
      }
      for (const pt of path) {
        clonedPath.push(pt);
      }
    }
    super.push(clonedPath);
  }

  override push(...paths: Iterable<PointD>[]) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }

  pushRange(paths: Iterable<Iterable<PointD>>) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
}
