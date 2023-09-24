import { Point64, isPoint64 } from "./Point64";

export const isPath64 = (obj: unknown): obj is Path64 => {
  return obj instanceof Path64 && obj.type === Path64TypeName;
};

export const Path64TypeName = "Path64";

export class Path64 extends Array<Point64> {
  readonly type: typeof Path64TypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: Point64[]);
  constructor(...args: [] | [number] | Point64[]);
  constructor(...args: [] | [number] | Point64[]) {
    const len = args.length;
    if (len === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super(len);
      for (let i = 0; i < len; i++) {
        const pt = args[i];
        if (isPoint64(pt)) {
          this[i] = Point64.clone(pt);
        } else {
          throw Error("todo: change message");
        }
      }
    }
    this.type = Path64TypeName;
  }

  static clone(path: Iterable<Point64>): Path64 {
    const result = new Path64();
    result.pushRange(path);
    return result;
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
