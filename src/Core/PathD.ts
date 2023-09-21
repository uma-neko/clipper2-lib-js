import { PointD } from "./PointD";

export const isPathD = (obj: unknown): obj is PathD => {
  return obj instanceof PathD && obj.type === PathDTypeName;
};

export const PathDTypeName = "PathD";

export class PathD extends Array<PointD> {
  readonly type: typeof PathDTypeName;

  constructor();
  constructor(...paths: PointD[]);
  constructor(arrayLength: number);
  constructor(...args: PointD[]|[number]) {
    if (args.length === 0) {
      super();
    } else if (typeof args[0] === "number") {
      super(args[0]);
    } else {
      super();
      for (const pt of args as PointD[]) {
        this.push(PointD.clone(pt));
      }
    }
    this.type = PathDTypeName;
  }

  clear() {
    this.length = 0;
  }
}
