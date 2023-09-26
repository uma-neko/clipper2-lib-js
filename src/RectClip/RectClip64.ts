import { OutPt2 } from "./OutPt2";
import { getBounds } from "../Clipper";
import {
  crossProduct64,
  getIntersectPoint,
  pointInPolygon,
} from "../Core/InternalClipper";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { Rect64 } from "../Core/Rect64";
import { PointInPolygonResult } from "../Engine/EngineEnums";
import type { Path64Base } from "../Core/Path64Base";
import { Path64TypedArray } from "../Core/Path64TypedArray";

export const Location = {
  left: 0,
  top: 1,
  right: 2,
  bottom: 3,
  inside: 4,
} as const;
export type Location = (typeof Location)[keyof typeof Location];

const path1ContainsPath2 = (path1: Path64Base, path2: Path64Base): boolean => {
  let ioCount = 0;
  for (const pt of path2) {
    const pip = pointInPolygon(pt, path1);
    switch (pip) {
      case PointInPolygonResult.IsInside:
        ioCount--;
        break;
      case PointInPolygonResult.IsOutside:
        ioCount++;
        break;
    }
    if (Math.abs(ioCount) > 1) {
      break;
    }
  }
  return ioCount <= 0;
};

const isClockwise = (
  prev: Location,
  curr: Location,
  prevPt: Point64,
  currPt: Point64,
  rectMidPoint: Point64,
): boolean => {
  if (areOpposites(prev, curr)) {
    return crossProduct64(prevPt, rectMidPoint, currPt) < 0;
  } else {
    return headingClockwise(prev, curr);
  }
};

const areOpposites = (prev: Location, curr: Location): boolean => {
  return Math.abs(prev - curr) === 2;
};

const headingClockwise = (prev: Location, curr: Location): boolean => {
  return (prev + 1) % 4 === curr;
};

const getAdjacentLocation = (loc: Location, isClockwise: boolean): Location => {
  const delta = isClockwise ? 1 : 3;
  return ((loc + delta) % 4) as Location;
};

const unlinkOp = (op: OutPt2): OutPt2 | undefined => {
  if (op === op.next) {
    return undefined;
  }
  op.prev!.next = op.next;
  op.next!.prev = op.prev;
  return op.next;
};

const unlinkOpBack = (op: OutPt2): OutPt2 | undefined => {
  if (op.next === op) {
    return undefined;
  }
  op.prev!.next = op.next;
  op.next!.prev = op.prev;
  return op.prev;
};

const getEdgesForPt = (pt: Point64, rec: Rect64): number => {
  let result = 0;
  if (pt.x === rec.left) {
    result = 1;
  } else if (pt.x === rec.right) {
    result = 4;
  }
  if (pt.y === rec.top) {
    result += 2;
  } else if (pt.y === rec.bottom) {
    result += 8;
  }
  return result;
};

const isHeadingClockwise = (
  pt1: Point64,
  pt2: Point64,
  edgeIdx: number,
): boolean => {
  switch (edgeIdx) {
    case 0:
      return pt2.y < pt1.y;
    case 1:
      return pt2.x > pt1.x;
    case 2:
      return pt2.y > pt1.y;
    default:
      return pt2.x < pt1.x;
  }
};

const hasHorzOverlap = (
  left1: Point64,
  right1: Point64,
  left2: Point64,
  right2: Point64,
): boolean => {
  return left1.x < right2.x && right1.x > left2.x;
};

const hasVertOverlap = (
  top1: Point64,
  bottom1: Point64,
  top2: Point64,
  bottom2: Point64,
): boolean => {
  return top1.y < bottom2.y && bottom1.y > top2.y;
};

const addToEdge = (edge: (OutPt2 | undefined)[], op: OutPt2) => {
  if (op.edge !== undefined) {
    return;
  }
  op.edge = edge!;
  edge.push(op);
};

const uncoupleEdge = (op: OutPt2) => {
  if (op.edge === undefined) {
    return;
  }

  for (let i = 0; i < op.edge.length; i++) {
    const op2 = op.edge[i];
    if (op2 === op) {
      op.edge[i] = undefined;
      break;
    }
  }
  op.edge = undefined;
};

const setNewOwner = (op: OutPt2, newIdx: number) => {
  op.ownerIdx = newIdx;
  let op2 = op.next;
  while (op2 !== op) {
    op2!.ownerIdx = newIdx;
    op2 = op2!.next;
  }
};

export const getLocation = (
  rec: Rect64,
  pt: Point64,
): { result: boolean; loc: Location } => {
  if (pt.x === rec.left && pt.y >= rec.top && pt.y <= rec.bottom) {
    return {
      result: false,
      loc: Location.left,
    };
  }
  if (pt.x === rec.right && pt.y >= rec.top && pt.y <= rec.bottom) {
    return {
      result: false,
      loc: Location.right,
    };
  }
  if (pt.y === rec.top && pt.x >= rec.left && pt.x <= rec.right) {
    return {
      result: false,
      loc: Location.top,
    };
  }
  if (pt.y === rec.bottom && pt.x >= rec.left && pt.x <= rec.right) {
    return {
      result: false,
      loc: Location.bottom,
    };
  }
  if (pt.x < rec.left) {
    return {
      result: true,
      loc: Location.left,
    };
  } else if (pt.x > rec.right) {
    return {
      result: true,
      loc: Location.right,
    };
  } else if (pt.y < rec.top) {
    return {
      result: true,
      loc: Location.top,
    };
  } else if (pt.y > rec.bottom) {
    return {
      result: true,
      loc: Location.bottom,
    };
  } else {
    return {
      result: true,
      loc: Location.inside,
    };
  }
};

const isHorizontal = (pt1: Point64, pt2: Point64): boolean => {
  return pt1.y === pt2.y;
};

const getSegmentIntersection = (
  p1: Point64,
  p2: Point64,
  p3: Point64,
  p4: Point64,
): { result: boolean; ip: Point64 } => {
  const res1 = crossProduct64(p1, p3, p4);
  const res2 = crossProduct64(p2, p3, p4);
  let ip: Point64;
  if (res1 === 0) {
    ip = Point64.clone(p1);
    let result: boolean;
    if (res2 === 0) {
      result = false;
    } else if (Point64.equals(p1, p3) || Point64.equals(p1, p4)) {
      result = true;
    } else if (isHorizontal(p3, p4)) {
      result = p1.x > p3.x === p1.x < p4.x;
    } else {
      result = p1.y > p3.y === p1.y < p4.y;
    }
    return { result, ip };
  } else if (res2 === 0) {
    ip = Point64.clone(p2);
    let result: boolean;
    if (Point64.equals(p2, p3) || Point64.equals(p2, p4)) {
      result = true;
    } else if (isHorizontal(p3, p4)) {
      result = p2.x > p3.x === p2.x < p4.x;
    } else {
      result = p2.y > p3.y === p2.y < p4.y;
    }
    return { result, ip };
  }

  if (res1 > 0 === res2 > 0) {
    ip = { x: 0n, y: 0n };
    return { result: false, ip };
  }

  const res3 = crossProduct64(p3, p1, p2);
  const res4 = crossProduct64(p4, p1, p2);

  if (res3 === 0) {
    ip = Point64.clone(p3);
    let result: boolean;
    if (Point64.equals(p3, p1) || Point64.equals(p3, p2)) {
      result = true;
    } else if (isHorizontal(p1, p2)) {
      result = p3.x > p1.x === p3.x < p2.x;
    } else {
      result = p3.y > p1.y === p3.y < p2.y;
    }
    return { result, ip };
  } else if (res4 === 0) {
    ip = Point64.clone(p4);
    let result: boolean;
    if (Point64.equals(p4, p1) || Point64.equals(p4, p2)) {
      result = true;
    } else if (isHorizontal(p1, p2)) {
      result = p4.x > p1.x === p4.x < p2.x;
    } else {
      result = p4.y > p1.y === p4.y < p2.y;
    }
    return { result, ip };
  }

  if (res3 > 0 === res4 > 0) {
    ip = { x: 0n, y: 0n };
    return { result: false, ip };
  }

  return getIntersectPoint(p1, p2, p3, p4);
};

export class RectClip64 {
  _rect: Rect64;
  _mp: Point64;
  _rectPath: Path64Base;
  _pathBounds: Rect64;
  _results: (OutPt2 | undefined)[];
  _edges: (OutPt2 | undefined)[][];
  _currIdx: number;

  constructor(rect: Rect64) {
    this._currIdx = -1;
    this._rect = rect;
    this._mp = rect.midPoint();
    this._rectPath = rect.asPath();
    this._pathBounds = new Rect64();
    this._results = [];
    this._edges = [];
    for (let i = 0; i < 8; i++) {
      this._edges[i] = [];
    }
  }

  add(pt: Point64, startingNewPath: boolean = false) {
    let currIdx = this._results.length;
    let result: OutPt2;
    if (currIdx === 0 || startingNewPath) {
      result = {
        ownerIdx: currIdx,
        pt: Point64.clone(pt),
      };
      this._results.push(result);
      result.prev = result;
      result.next = result;
    } else {
      currIdx--;
      const prevOp = this._results[currIdx];
      if (Point64.equals(prevOp!.pt, pt)) {
        return prevOp;
      }

      result = {
        ownerIdx: currIdx,
        pt: Point64.clone(pt),
        next: prevOp!.next,
      };

      prevOp!.next!.prev = result;
      prevOp!.next = result;
      result.prev = prevOp;
      this._results[currIdx] = result;
    }
    return result;
  }

  addCorner(prev: Location, curr: Location) {
    this.add(
      this._rectPath.getClone(headingClockwise(prev, curr) ? prev : curr),
    );
  }

  addCornerRef(loc: Location, isClockwise: boolean): Location {
    if (isClockwise) {
      this.add(this._rectPath.getClone(loc));
      loc = getAdjacentLocation(loc, true);
      return loc;
    } else {
      loc = getAdjacentLocation(loc, false);
      this.add(this._rectPath.getClone(loc));
      return loc;
    }
  }

  getIntersection(
    rectPath: Path64Base,
    p: Point64,
    p2: Point64,
    loc: Location,
  ): { result: boolean; loc: Location; ip: Point64 } {
    let ip = { x: 0n, y: 0n };
    let result: boolean;
    const rectPath0Left = rectPath.getClone(0);
    const rectPath1Top = rectPath.getClone(1);
    const rectPath2Right = rectPath.getClone(2);
    const rectPath3Bottom = rectPath.getClone(3);

    switch (loc) {
      case Location.left:
        if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath3Bottom,
          )).result
        ) {
          break;
        } else if (
          p.y < rectPath0Left.y &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath1Top,
          )).result
        ) {
          loc = Location.top;
          break;
        } else if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath2Right,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
      case Location.right:
        if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath1Top,
            rectPath2Right,
          )).result
        ) {
          break;
        } else if (
          p.y < rectPath0Left.y &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath1Top,
          )).result
        ) {
          loc = Location.top;
          break;
        } else if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath2Right,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
      case Location.top:
        if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath1Top,
          )).result
        ) {
          break;
        } else if (
          p.x < rectPath0Left.x &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.left;
          break;
        } else if (
          p.x > rectPath1Top.x &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath1Top,
            rectPath2Right,
          )).result
        ) {
          loc = Location.right;
          break;
        } else {
          result = false;
          break;
        }
      case Location.bottom:
        if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath2Right,
            rectPath3Bottom,
          )).result
        ) {
          break;
        } else if (
          p.x < rectPath3Bottom.x &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.left;
          break;
        } else if (
          p.x > rectPath2Right.x &&
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath1Top,
            rectPath2Right,
          )).result
        ) {
          loc = Location.right;
          break;
        } else {
          result = false;
          break;
        }
      default:
        if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.left;
          break;
        } else if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath0Left,
            rectPath1Top,
          )).result
        ) {
          loc = Location.top;
          break;
        } else if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath1Top,
            rectPath2Right,
          )).result
        ) {
          loc = Location.right;
          break;
        } else if (
          ({ result, ip } = getSegmentIntersection(
            p,
            p2,
            rectPath2Right,
            rectPath3Bottom,
          )).result
        ) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
    }

    return {
      result,
      ip,
      loc,
    };
  }

  getNextLocation(
    path: Path64Base,
    loc: Location,
    i: number,
    highI: number,
  ): { loc: Location; i: number } {
    switch (loc) {
      case Location.left: {
        while (i <= highI && path.getClone(i).x <= this._rect.left) {
          i++;
        }

        const currPt = path.getClone(i);

        if (i > highI) {
          break;
        }

        if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.top: {
        while (i <= highI && path.getClone(i).y <= this._rect.top) {
          i++;
        }
        const currPt = path.getClone(i);

        if (i > highI) {
          break;
        }

        if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.right: {
        while (i <= highI && path.getClone(i).x >= this._rect.right) {
          i++;
        }
        const currPt = path.getClone(i);

        if (i > highI) {
          break;
        }

        if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.bottom: {
        while (i <= highI && path.getClone(i).y >= this._rect.bottom) {
          i++;
        }
        const currPt = path.getClone(i);

        if (i > highI) {
          break;
        }

        if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.inside: {
        while (i <= highI) {
          const currPt = path.getClone(i);
          if (currPt.x < this._rect.left) {
            loc = Location.left;
          } else if (currPt.x > this._rect.right) {
            loc = Location.right;
          } else if (currPt.y > this._rect.bottom) {
            loc = Location.bottom;
          } else if (currPt.y < this._rect.top) {
            loc = Location.top;
          } else {
            this.add(currPt);
            i++;
            continue;
          }
          break;
        }
        break;
      }
    }

    return { loc, i };
  }

  executeInternal(path: Path64Base) {
    if (path.length < 3 || this._rect.isEmpty()) {
      return;
    }
    const startLocs: Location[] = [];

    let firstCross: Location = Location.inside;
    let crossingLoc: Location = firstCross;
    let prev: Location = firstCross;

    let i: number;
    const highI = path.length - 1;

    let loc: Location;

    if (!({ loc } = getLocation(this._rect, path.getClone(highI))).result) {
      i = highI - 1;
      while (
        i >= 0 &&
        !({ loc: prev } = getLocation(this._rect, path.getClone(i))).result
      ) {
        i--;
      }
      if (i < 0) {
        for (const pt of path) {
          this.add(pt);
        }
        return;
      }
      if (prev === Location.inside) {
        loc = Location.inside;
      }
    }
    const startingLoc = loc;

    i = 0;
    while (i <= highI) {
      prev = loc;
      const prevCrossLoc: Location = crossingLoc;
      ({ loc, i } = this.getNextLocation(path, loc, i, highI));
      if (i > highI) {
        break;
      }

      const currPt = path.getClone(i);
      const prevPt = i === 0 ? path.getClone(highI) : path.getClone(i - 1);
      crossingLoc = loc;
      let ip: Point64;
      if (
        !({ loc: crossingLoc, ip } = this.getIntersection(
          this._rectPath,
          currPt,
          prevPt,
          crossingLoc,
        )).result
      ) {
        if (prevCrossLoc === Location.inside) {
          const isClockw = isClockwise(prev, loc, prevPt, currPt, this._mp);
          do {
            startLocs.push(prev);
            prev = getAdjacentLocation(prev, isClockw);
          } while (prev !== loc);
          crossingLoc = prevCrossLoc;
        } else if (prev !== Location.inside && prev !== loc) {
          const isClockw = isClockwise(prev, loc, prevPt, currPt, this._mp);
          do {
            prev = this.addCornerRef(prev, isClockw);
          } while (prev !== loc);
        }
        i++;
        continue;
      }

      if (loc === Location.inside) {
        if (firstCross === Location.inside) {
          firstCross = crossingLoc;
          startLocs.push(prev);
        } else if (prev !== crossingLoc) {
          const isClockw = isClockwise(
            prev,
            crossingLoc,
            prevPt,
            currPt,
            this._mp,
          );
          do {
            prev = this.addCornerRef(prev, isClockw);
          } while (prev !== crossingLoc);
        }
      } else if (prev !== Location.inside) {
        loc = prev;
        let ip2: Point64;
        ({ loc, ip: ip2 } = this.getIntersection(
          this._rectPath,
          prevPt,
          currPt,
          loc,
        ));
        if (prevCrossLoc !== Location.inside && prevCrossLoc !== loc) {
          this.addCorner(prevCrossLoc, loc);
        }

        if (firstCross === Location.inside) {
          firstCross = loc;
          startLocs.push(prev);
        }

        loc = crossingLoc;
        this.add(ip2);

        if (Point64.equals(ip, ip2)) {
          ({ loc } = getLocation(this._rect, currPt));
          this.addCorner(crossingLoc, loc);
          crossingLoc = loc;
          continue;
        }
      } else {
        loc = crossingLoc;
        if (firstCross === Location.inside) {
          firstCross = crossingLoc;
        }
      }

      this.add(ip);
    }

    if (firstCross === Location.inside) {
      if (startingLoc !== Location.inside) {
        if (
          this._pathBounds.contains(this._rect) &&
          path1ContainsPath2(path, this._rectPath)
        ) {
          for (let j = 0; j < 4; j++) {
            this.add(this._rectPath.getClone(j));
            addToEdge(this._edges[j * 2], this._results[0]!);
          }
        }
      }
    } else if (
      loc !== Location.inside &&
      (loc !== firstCross || startLocs.length > 2)
    ) {
      if (startLocs.length > 0) {
        prev = loc;
        for (const loc2 of startLocs) {
          if (prev === loc2) {
            continue;
          }
          prev = this.addCornerRef(prev, headingClockwise(prev, loc2));
          prev = loc2;
        }
        loc = prev;
      }
      if (loc !== firstCross) {
        loc = this.addCornerRef(loc, headingClockwise(loc, firstCross));
      }
    }
  }

  execute(paths: Paths64): Paths64 {
    const result = new Paths64();
    if (this._rect.isEmpty()) {
      return result;
    }

    for (const path of paths) {
      if (path.length < 3) {
        continue;
      }
      this._pathBounds = getBounds(path);

      if (!this._rect.intersects(this._pathBounds)) {
        continue;
      } else if (this._rect.contains(this._pathBounds)) {
        result.push(path);
        continue;
      }

      this.executeInternal(path);
      this.checkEdges();

      for (let i = 0; i < 4; i++) {
        this.tidyEdgePair(i, this._edges[i * 2], this._edges[i * 2 + 1]);
      }

      for (const op of this._results) {
        const tmp = this.getPath(op);
        if (tmp.length > 0) {
          result.push(tmp);
        }
      }

      this._results.length = 0;

      for (let i = 0; i < 8; i++) {
        this._edges[i].length = 0;
      }
    }

    return result;
  }

  checkEdges() {
    for (let i = 0; i < this._results.length; i++) {
      let op = this._results[i];
      let op2 = op;

      if (op === undefined) {
        continue;
      }

      do {
        if (crossProduct64(op2!.prev!.pt, op2!.pt, op2!.next!.pt) === 0) {
          if (op2 === op) {
            op2 = unlinkOpBack(op2!);
            if (op2 === undefined) {
              break;
            }
            op = op2.prev;
          } else {
            op2 = unlinkOpBack(op2!);
            if (op2 === undefined) {
              break;
            }
          }
        } else {
          op2 = op2!.next;
        }
      } while (op2 !== op);

      if (op2 === undefined) {
        this._results[i] = undefined;
        continue;
      }
      this._results[i] = op2;
      let edgeSet1 = getEdgesForPt(op!.prev!.pt, this._rect);
      op2 = op;

      do {
        const edgeSet2 = getEdgesForPt(op2!.pt, this._rect);
        if (edgeSet2 !== 0 && op2!.edge === undefined) {
          const combinedSet = edgeSet1 & edgeSet2;

          for (let j = 0; j < 4; ++j) {
            if ((combinedSet & (1 << j)) !== 0) {
              if (isHeadingClockwise(op2!.prev!.pt, op2!.pt, j)) {
                addToEdge(this._edges[j * 2], op2!);
              } else {
                addToEdge(this._edges[j * 2 + 1], op2!);
              }
            }
          }
        }
        edgeSet1 = edgeSet2;
        op2 = op2!.next;
      } while (op2 !== op);
    }
  }

  tidyEdgePair(
    idx: number,
    cw: (OutPt2 | undefined)[],
    ccw: (OutPt2 | undefined)[],
  ) {
    if (ccw.length === 0) {
      return;
    }

    const isHorz = idx === 1 || idx === 3;
    const cwIsTowardLarger = idx === 1 || idx === 2;
    let i = 0;
    let j = 0;
    let p1: OutPt2 | undefined;
    let p2: OutPt2 | undefined;
    let p1a: OutPt2 | undefined;
    let p2a: OutPt2 | undefined;
    let op: OutPt2 | undefined;
    let op2: OutPt2 | undefined;

    while (i < cw.length) {
      p1 = cw[i];
      if (p1 === undefined || p1.next === p1.prev) {
        cw[i++] = undefined;
        j = 0;
        continue;
      }

      const jLim = ccw.length;
      while (
        j < jLim &&
        (ccw[j] === undefined || ccw[j]!.next === ccw[j]!.prev)
      ) {
        j++;
      }

      if (j === jLim) {
        i++;
        j = 0;
        continue;
      }

      if (cwIsTowardLarger) {
        p1 = cw[i]!.prev!;
        p1a = cw[i];
        p2 = ccw[j];
        p2a = ccw[j]!.prev!;
      } else {
        p1 = cw[i];
        p1a = cw[i]!.prev!;
        p2 = ccw[j]!.prev!;
        p2a = ccw[j];
      }

      if (
        (isHorz && !hasHorzOverlap(p1!.pt, p1a!.pt, p2!.pt, p2a!.pt)) ||
        (!isHorz && !hasVertOverlap(p1!.pt, p1a!.pt, p2!.pt, p2a!.pt))
      ) {
        ++j;
        continue;
      }

      const isRejoining = cw[i]!.ownerIdx !== ccw[j]!.ownerIdx;

      if (isRejoining) {
        this._results[p2!.ownerIdx] = undefined;
        setNewOwner(p2!, p1!.ownerIdx);
      }

      if (cwIsTowardLarger) {
        p1!.next = p2;
        p2!.prev = p1;
        p1a!.prev = p2a;
        p2a!.next = p1a;
      } else {
        p1!.prev = p2;
        p2!.next = p1;
        p1a!.next = p2a;
        p2a!.prev = p1a;
      }

      if (!isRejoining) {
        const new_idx = this._results.length;
        this._results.push(p1a);
        setNewOwner(p1a!, new_idx);
      }

      if (cwIsTowardLarger) {
        op = p2;
        op2 = p1a;
      } else {
        op = p1;
        op2 = p2a;
      }
      this._results[op!.ownerIdx] = op;
      this._results[op2!.ownerIdx] = op2;

      const opIsLarger: boolean = isHorz
        ? op!.pt.x > op!.prev!.pt.x
        : op!.pt.y > op!.prev!.pt.y;
      const op2IsLarger: boolean = isHorz
        ? op2!.pt.x > op2!.prev!.pt.x
        : op2!.pt.y > op2!.prev!.pt.y;

      if (op!.next === op!.prev || Point64.equals(op!.pt, op!.prev!.pt)) {
        if (op2IsLarger === cwIsTowardLarger) {
          cw[i] = op2;
          ccw[j++] = undefined;
        } else {
          ccw[j] = op2;
          cw[i++] = undefined;
        }
      } else if (
        op2!.next === op2!.prev ||
        Point64.equals(op2!.pt, op2!.prev!.pt)
      ) {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
          ccw[j++] = undefined;
        } else {
          ccw[j] = op;
          cw[i++] = undefined;
        }
      } else if (opIsLarger === op2IsLarger) {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
          uncoupleEdge(op2!);
          addToEdge(cw, op2!);
          ccw[j++] = undefined;
        } else {
          cw[i++] = undefined;
          ccw[j] = op2;
          uncoupleEdge(op!);
          addToEdge(ccw, op!);
          j = 0;
        }
      } else {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
        } else {
          ccw[j] = op;
        }
        if (op2IsLarger === cwIsTowardLarger) {
          cw[i] = op2;
        } else {
          ccw[j] = op2;
        }
      }
    }
  }

  getPath(op: OutPt2 | undefined): Path64Base {
    if (op === undefined || op.prev === op.next) {
      return new Path64TypedArray();
    }

    let op2: OutPt2 | undefined = op.next;

    while (op2 !== undefined && op2 !== op) {
      if (crossProduct64(op2.prev!.pt, op2.pt, op2.next!.pt) === 0) {
        op = op2.prev;
        op2 = unlinkOp(op2);
      } else {
        op2 = op2.next;
      }
    }

    if (op2 === undefined) {
      return new Path64TypedArray();
    }

    const result: Path64Base = new Path64TypedArray();
    result.push(op!.pt);
    op2 = op!.next;

    while (op2 !== op) {
      result.push(op2!.pt);
      op2 = op2!.next;
    }

    return result;
  }
}
