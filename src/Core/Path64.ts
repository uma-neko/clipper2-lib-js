import { Point64 } from "./Point64";

export const isPath64 = (obj: unknown): obj is Path64 => {
  return obj instanceof Path64 && obj.type === Path64TypeName;
};

export const Path64TypeName = "Path64";

export class Path64 extends Array<Point64> {
  readonly type: typeof Path64TypeName;
  constructor(path?: Iterable<Point64>) {
    super();
    this.type = Path64TypeName;
    if (path === undefined) {
      return;
    }
    for (const pt of path) {
      this.push(Point64.clone(pt));
    }
  }

  clear() {
    this.length = 0;
  }
}
