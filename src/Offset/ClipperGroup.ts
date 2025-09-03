import { EndType, JoinType } from "./OffsetEnums";
import { Paths64 } from "../Core/Paths64";
import { area, stripDuplicates } from "../Clipper";

const getLowestPathIdx = (paths: Paths64): number => {
  let result = -1;
  let botPtX = 9223372036854775807n;
  let botPtY = -9223372036854775808n;

  for (let i = 0; i < paths.length; i++) {
    for (const pt of paths[i]) {
      if (pt.y < botPtY || (pt.y === botPtY && pt.x >= botPtX)) {
        continue;
      }
      result = i;
      botPtX = pt.x;
      botPtY = pt.y;
    }
  }
  return result;
};

export class ClipperGroup {
  inPaths: Paths64;
  joinType: JoinType;
  endType: EndType;
  pathsReversed: boolean;
  lowestPathIdx: number;

  constructor(
    paths: Paths64,
    joinType: JoinType,
    endType: EndType = EndType.Polygon,
  ) {
    this.joinType = joinType;
    this.endType = endType;

    const isJoined = endType === EndType.Polygon || endType === EndType.Joined;
    this.inPaths = new Paths64();

    for (const path of paths) {
      this.inPaths.push(stripDuplicates(path, isJoined));
    }

    if (endType === EndType.Polygon) {
      this.lowestPathIdx = getLowestPathIdx(this.inPaths);

      this.pathsReversed =
        this.lowestPathIdx >= 0 && area(this.inPaths[this.lowestPathIdx]) < 0;
    } else {
      this.lowestPathIdx = -1;
      this.pathsReversed = false;
    }
  }
}
