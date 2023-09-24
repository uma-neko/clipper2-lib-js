import { EndType, JoinType } from "./OffsetEnums";
import { Path64 } from "../Core/Path64";
import { Paths64 } from "../Core/Paths64";
import type { Path64Base } from "../Core/Path64Base";

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
    this.outPath = new Path64();
    this.outPaths = new Paths64();
    this.pathsReversed = false;
  }
}
