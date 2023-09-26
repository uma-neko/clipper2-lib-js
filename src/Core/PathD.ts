import { isNotNullish } from "../CommonUtils";
import { PathDTypeName, PathDBase } from "./PathDBase";
import { PointD } from "./PointD";

export const isPathD = (obj: unknown): obj is PathDBase => {
  return isNotNullish(obj) && obj.type === PathDTypeName;
};

export class PathD extends Array<PointD> implements PathDBase {
  readonly type: typeof PathDTypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: PointD[]);
  constructor(...args: [] | [number] | PointD[]);
  constructor(...args: [] | [number] | PointD[]) {
    if (args.length === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      this.pushRange(args as PointD[]);
    }
    this.type = PathDTypeName;
  }

  clone() {
    const clonedPath = new PathD();
    clonedPath.pushRange(this);
    return clonedPath;
  }

  get(index: number): PointD {
    return this[index];
  }

  getClone(index: number): PointD {
    return { x: this[index].x, y: this[index].y };
  }

  set(index: number, x: number, y: number) {
    this[index].x = x;
    this[index].y = y;
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

  *getClones() {
    for (const pt of this) {
      yield PointD.clone(pt);
    }
  }
}
