import { EndType, JoinType } from "./OffsetEnums";
import { Path64 } from "../Core/Path64";
import { Paths64 } from "../Core/Paths64";

export class ClipperGroup {
  inPaths: Paths64;
  outPath: Path64;
  outPaths: Paths64;
  joinType: JoinType;
  endType: EndType;
  pathsReversed: boolean;

  constructor(
    paths: Paths64,
    joinType: JoinType,
    endType: EndType = EndType.Polygon,
  ) {
    this.inPaths = new Paths64(paths);
    this.joinType = joinType;
    this.endType = endType;
    this.outPath = new Path64();
    this.outPaths = new Paths64();
    this.pathsReversed = false;
  }
}
