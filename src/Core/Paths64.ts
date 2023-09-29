import { isNotNullish } from "../CommonUtils";
import { isPath64 } from "./Path64";
import { type IPath64 } from "./IPath64";
import { Path64TypedArray } from "./Path64TypedArray";
import { Point64 } from "./Point64";

export const isPaths64 = (obj: unknown): obj is Paths64 => {
  return isNotNullish(obj) && obj.type === Paths64TypeName;
};

export const Paths64TypeName = "Paths64";

export class Paths64 extends Array<IPath64> {
  readonly type: typeof Paths64TypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: IPath64[]);
  constructor(...args: [] | [number] | IPath64[]);
  constructor(...args: [] | [number] | IPath64[]) {
    const len = args.length;
    if (len === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      for (const path of args) {
        this._push(path as IPath64);
      }
    }
    this.type = Paths64TypeName;
  }

  static clone(paths: Iterable<Iterable<Point64>>): Paths64 {
    const result = new Paths64();
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

  _push(path: Iterable<Point64>) {
    let clonedPath: IPath64;
    if (isPath64(path)) {
      clonedPath = path.clone();
    } else {
      if (
        "length" in path &&
        typeof path.length === "number" &&
        path.length > 0
      ) {
        clonedPath = new Path64TypedArray(path.length);
      } else {
        clonedPath = new Path64TypedArray();
      }

      for (const pt of path) {
        clonedPath.push(pt);
      }
    }
    super.push(clonedPath);
  }

  directPush(path: IPath64) {
    super.push(path);
  }

  override push(...paths: Iterable<Point64>[]) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }

  pushRange(paths: Iterable<Iterable<Point64>>) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
}
