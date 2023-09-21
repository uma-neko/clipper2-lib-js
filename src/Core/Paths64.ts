import { Path64, isPath64 } from "./Path64";
import { Point64 } from "./Point64";

export const isPaths64 = (obj: unknown): obj is Paths64 => {
  return obj instanceof Paths64 && obj.type === Paths64TypeName;
};

export const Paths64TypeName = "Paths64";

export class Paths64 extends Array<Path64> {
  readonly type: typeof Paths64TypeName;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: Path64[]);
  constructor(...args: [] | [number] | Path64[]);
  constructor(...args: [] | [number] | Path64[]) {
    const len = args.length;
    if (len === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super(len);
      for (let i = 0; i < len; i++) {
        const path = args[i];
        if (isPath64(path)) {
          this[i] = Path64.clone(path);
        } else {
          throw Error("todo: change message");
        }
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
    for (const path of this) {
      path.length = 0;
    }
    this.length = 0;
  }

  override push(...paths: Iterable<Point64>[]) {
    for (const path of paths) {
      super.push(Path64.clone(path));
    }
    return this.length;
  }

  pushRange(paths: Iterable<Iterable<Point64>>) {
    for (const path of paths) {
      super.push(Path64.clone(path));
    }
    return this.length;
  }
}
