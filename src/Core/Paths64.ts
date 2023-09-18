import { Path64 } from "./Path64";
import { Point64 } from "./Point64";

export const isPaths64 = (obj: unknown): obj is Paths64 => {
  return obj instanceof Paths64 && obj.type === Paths64TypeName;
};

export const Paths64TypeName = "Paths64";

export class Paths64 extends Array<Path64> {
  readonly type: typeof Paths64TypeName;
  constructor(paths?: Iterable<Iterable<Point64>>) {
    super();
    this.type = Paths64TypeName;
    if (paths === undefined) {
      return;
    }
    for (const path of paths) {
      this.push(path);
    }
  }

  clear() {
    for (const path of this) {
      path.length = 0;
    }
    this.length = 0;
  }

  override push(...paths: Iterable<Point64>[]) {
    for (const path of paths) {
      super.push(new Path64(path));
    }
    return this.length;
  }
}
