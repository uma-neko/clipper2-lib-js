import { Point64 } from "./Point64";

export const isPath64 = (obj: unknown): obj is Path64 => {
  return obj instanceof Path64 && obj.type === Path64TypeName;
};

export const Path64TypeName = "Path64";

export class Path64 extends Array<Point64> {
  readonly type: typeof Path64TypeName;
  
  constructor();
  constructor(...paths: Point64[]);
  constructor(arrayLength: number);
  constructor(...args:Point64[] | [number]) {
    if (args.length === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      for (const pt of args as Point64[]) {
        this.push(Point64.clone(pt));
      }
    }
    this.type = Path64TypeName;
  }

  clear() {
    this.length = 0;
  }
}
