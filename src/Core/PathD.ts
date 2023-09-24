import { PathDTypeName, PathDBase } from "./PathDBase";
import { PointD, isPointD } from "./PointD";

export const isPathD = (obj: unknown): obj is PathD => {
  return obj instanceof PathD && obj.type === PathDTypeName;
};

export class PathD extends Array<PointD> {
  readonly type: typeof PathDTypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: PointD[]);
  constructor(...args: [] | [number] | PointD[]);
  constructor(...args: [] | [number] | PointD[]) {
    const len = args.length;
    if (len === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super(len);
      for (let i = 0; i < len; i++) {
        const pt = args[i];
        if (isPointD(pt)) {
          this[i] = PointD.clone(pt);
        } else {
          throw Error("todo: change message");
        }
      }
    }
    this.type = PathDTypeName;
  }

  static clone(path: Iterable<PointD>): PathDBase {
    const result = new PathD();
    result.pushRange(path);
    return result;
  }

  override push(...path: PointD[]) {
    for (const pt of path) {
      super.push(PointD.clone(pt));
    }
    return this.length;
  }

  pushRange(path: Iterable<PointD>) {
    for (const pt of path) {
      super.push(PointD.clone(pt));
    }
    return this.length;
  }

  clear() {
    if (this.length !== 0) {
      this.length = 0;
    }
  }
}
