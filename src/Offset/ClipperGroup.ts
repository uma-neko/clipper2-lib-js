import { EndType, JoinType } from "./OffsetEnums";
import { Paths64 } from "../Core/Paths64";
import { Rect64 } from "../Core/Rect64";
import { area, stripDuplicates } from "../Clipper";

const getMultiBounds = (paths: Paths64): Rect64[] => {
  const boundsList: Rect64[] = [];
  for (const path of paths) {
    if (path.length < 1) {
      boundsList.push(new Rect64(false));
      continue;
    }

    const pt1x = path.getX(0);
    const pt1y = path.getY(0);

    const r = new Rect64(pt1x, pt1y, pt1x, pt1y);

    for (let i = 0; i < path.length; i++) {
      const ptx = path.getX(i);
      const pty = path.getY(i);

      if (pty > r.bottom) {
        r.bottom = pty;
      } else if (pty < r.top) {
        r.top = pty;
      }

      if (ptx > r.right) {
        r.right = ptx;
      } else if (ptx < r.left) {
        r.left = ptx;
      }
    }

    boundsList.push(r);
  }

  return boundsList;
};

const getLowestPathIdx = (boundsList: Rect64[]): number => {
  let result = -1;
  let botPtX = 9223372036854775807n;
  let botPtY = -9223372036854775808n;

  for (let i = 0; i < boundsList.length; i++) {
    const r = boundsList[i];
    if (!r.isValid()) {
      continue;
    } else if (r.bottom > botPtY || (r.bottom === botPtY && r.left < botPtX)) {
      botPtX = r.left;
      botPtY = r.bottom;
      result = i;
    }
  }
  return result;
};

export class ClipperGroup {
  inPaths: Paths64;
  boundsList: Rect64[];
  isHoleList: boolean[];
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

    this.boundsList = getMultiBounds(this.inPaths);

    if (endType === EndType.Polygon) {
      this.lowestPathIdx = getLowestPathIdx(this.boundsList);

      this.isHoleList = [];

      for (const path of this.inPaths) {
        this.isHoleList.push(area(path) < 0);
      }

      this.pathsReversed =
        this.lowestPathIdx >= 0 && this.isHoleList[this.lowestPathIdx];
      if (this.pathsReversed) {
        for (let i = 0; i < this.isHoleList.length; i++) {
          this.isHoleList[i] = !this.isHoleList[i];
        }
      }
    } else {
      this.lowestPathIdx = -1;
      this.isHoleList = Array.from(
        { length: this.inPaths.length },
        () => false,
      );
      this.pathsReversed = false;
    }
  }
}
