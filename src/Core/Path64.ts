import { isNotNullish } from "../CommonUtils";
import { Path64Base, Path64TypeName } from "./Path64Base";
import { Point64 } from "./Point64";

export const isPath64 = (obj: unknown): obj is Path64Base => {
  return isNotNullish(obj) && obj.type === Path64TypeName;
};

export class Path64 extends Array<Point64> implements Path64Base {
  readonly type: typeof Path64TypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: Point64[]);
  constructor(...args: [] | [number] | Point64[]);
  constructor(...args: [] | [number] | Point64[]) {
    if (args.length === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      this.pushRange(args as Point64[]);
    }
    this.type = Path64TypeName;
  }

  clone() {
    const clonedPath = new Path64();
    clonedPath.pushRange(this);
    return clonedPath;
  }

  get(index: number): Point64 {
    return this[index];
  }

  getX(index: number): bigint {
    return this[index].x;
  }

  getY(index: number): bigint {
    return this[index].y;
  }

  getClone(index: number): Point64 {
    return { x: this[index].x, y: this[index].y };
  }

  set(index: number, x: bigint, y: bigint) {
    this[index].x = x;
    this[index].y = y;
  }

  override push(...path: Point64[]) {
    for (const pt of path) {
      super.push(Point64.clone(pt));
    }
    return this.length;
  }

  pushRange(path: Iterable<Point64>) {
    for (const pt of path) {
      super.push(Point64.clone(pt));
    }
    return this.length;
  }

  clear() {
    if (this.length !== 0) {
      this.length = 0;
    }
  }
}
