import { PointD } from "./PointD";

export const isPathD = (obj: unknown): obj is PathD => {
  return obj instanceof PathD && obj.type === PathDTypeName;
};

export const PathDTypeName = "PathD";

export class PathD extends Array<PointD> {
  readonly type: typeof PathDTypeName;
  constructor(path?: Iterable<PointD>) {
    super();
    this.type = PathDTypeName;
    if (path === undefined) {
      return;
    }
    for (const pt of path) {
      this.push(PointD.clone(pt));
    }
  }

  clear() {
    this.length = 0;
  }
}
