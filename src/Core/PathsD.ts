import { PathD } from "./PathD";
import { PointD } from "./PointD";

export const isPathsD = (obj: unknown): obj is PathsD => {
  return obj instanceof PathsD && obj.type === PathsDTypeName;
};

export const PathsDTypeName = "PathsD";

export class PathsD extends Array<PathD> {
  readonly type: typeof PathsDTypeName;
  constructor(paths?: Iterable<Iterable<PointD>>) {
    super();
    this.type = PathsDTypeName;
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

  override push(...paths: Iterable<PointD>[]) {
    for (const path of paths) {
      super.push(new PathD(path));
    }
    return this.length;
  }
}
