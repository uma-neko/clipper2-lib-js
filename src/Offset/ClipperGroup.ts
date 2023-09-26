import { EndType, JoinType } from "./OffsetEnums";
import { Paths64 } from "../Core/Paths64";
import type { Path64Base } from "../Core/Path64Base";
import { Path64TypedArray } from "../Core/Path64TypedArray";

export class ClipperGroup {
  inPaths: Paths64;
  outPath: Path64Base;
  outPaths: Paths64;
  joinType: JoinType;
  endType: EndType;
  pathsReversed: boolean;

  constructor(
    paths: Paths64,
    joinType: JoinType,
    endType: EndType = EndType.Polygon,
  ) {
    this.inPaths = Paths64.clone(paths);
    this.joinType = joinType;
    this.endType = endType;
    this.outPath = new Path64TypedArray();
    this.outPaths = new Paths64();
    this.pathsReversed = false;
  }
}
