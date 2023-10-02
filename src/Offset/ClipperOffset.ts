import { ClipperGroup } from "./ClipperGroup";
import { EndType, JoinType } from "./OffsetEnums";
import {
  area,
  ellipse,
  getBounds,
  numberToBigInt,
  reversePath,
  sqr,
  stripDuplicates,
} from "../Clipper";
import { ClipType, FillRule } from "../Core/CoreEnums";
import {
  crossProductD,
  defaultArcTolerance,
  dotProductD,
  isAlmostZero,
} from "../Core/InternalClipper";
import { IPathD } from "../Core/IPathD";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";
import { Rect64 } from "../Core/Rect64";
import { Clipper64 } from "../Engine/Clipper64";
import { PolyTree64 } from "../Engine/PolyTree64";
import type { IPath64 } from "../Core/IPath64";
import { Path64TypedArray } from "../Core/Path64TypedArray";
import { PathDTypedArray } from "../Core/PathDTypedArray";

export type DeltaCallback64 = (
  path: IPath64,
  path_norms: IPathD,
  currPt: number,
  prevPt: number,
) => number;

const tolerance = 1.0e-12;

export class ClipperOffset {
  _groupList: ClipperGroup[];
  _normals: IPathD;
  _solution: Paths64;
  _groupDelta: number;
  _delta: number;
  _mitLimSqr: number;
  _stepsPerRad: number;
  _stepSin: number;
  _stepCos: number;
  _joinType: JoinType;
  _endType: EndType;
  arcTolerance: number;
  mergeGroups: boolean;
  miterLimit: number;
  preserveCollinear: boolean;
  reverseSolution: boolean;
  deltaCallback?: DeltaCallback64;

  constructor(
    miterLimit: number = 2,
    arcTolerance: number = 0,
    preserveCollinear: boolean = false,
    reverseSolution: boolean = false,
  ) {
    this.miterLimit = miterLimit;
    this.arcTolerance = arcTolerance;
    this.mergeGroups = true;
    this.preserveCollinear = preserveCollinear;
    this.reverseSolution = reverseSolution;
    this._groupList = [];
    this._normals = new PathDTypedArray();
    this._solution = new Paths64();
    this._groupDelta = 0;
    this._delta = 0;
    this._mitLimSqr = 0;
    this._stepsPerRad = 0;
    this._stepSin = 0;
    this._stepCos = 0;
    this._joinType = JoinType.Bevel;
    this._endType = EndType.Polygon;
  }

  clear() {
    this._groupList.length = 0;
  }

  addPath(path: IPath64, joinType: JoinType, endType: EndType) {
    const cnt = path.length;
    if (cnt === 0) {
      return;
    }
    const pp = new Paths64();
    pp.push(path);
    this.addPaths(pp, joinType, endType);
  }

  addPaths(paths: Paths64, joinType: JoinType, endType: EndType) {
    const cnt = paths.length;
    if (cnt === 0) {
      return;
    }

    this._groupList.push(new ClipperGroup(paths, joinType, endType));
  }

  executeInternal(delta: number) {
    this._solution.clear();
    if (this._groupList.length === 0) {
      return;
    }

    if (Math.abs(delta) < 0.5) {
      for (const group of this._groupList) {
        for (const path of group.inPaths) {
          this._solution.push(path);
        }
      }
    } else {
      this._delta = delta;
      this._mitLimSqr = this.miterLimit <= 1 ? 2.0 : 2.0 / sqr(this.miterLimit);

      for (const group of this._groupList) {
        this.doGroupOffset(group);
      }
    }
  }

  execute(
    deltaOrDeltaCallback: number | DeltaCallback64,
    solutionOrPolyTree: Paths64 | PolyTree64,
  ) {
    let delta: number;

    if (typeof deltaOrDeltaCallback === "number") {
      delta = deltaOrDeltaCallback;
    } else {
      this.deltaCallback = deltaOrDeltaCallback;
      delta = 1;
    }

    solutionOrPolyTree.clear();
    this.executeInternal(delta);
    if (this._groupList.length === 0) {
      return;
    }

    const c = new Clipper64();
    c.preserveCollinear = this.preserveCollinear;
    c.reverseSolution =
      this.reverseSolution !== this._groupList[0].pathsReversed;

    c.addSubject(this._solution);

    c.execute(
      ClipType.Union,
      this._groupList[0].pathsReversed ? FillRule.Negative : FillRule.Positive,
      solutionOrPolyTree as Paths64 & PolyTree64,
    );
  }

  getUnitNormal(pt1: Point64, pt2: Point64): PointD {
    let dx = Number(pt2.x - pt1.x);
    let dy = Number(pt2.y - pt1.y);
    if (dx === 0 && dy === 0) {
      return { x: 0, y: 0 };
    }

    const f = 1.0 / Math.sqrt(dx * dx + dy * dy);

    dx *= f;
    dy *= f;

    return { x: dy, y: -dx };
  }

  getBoundsAndLowestPolyIdx(paths: Paths64): { index: number; rec: Rect64 } {
    const rec = new Rect64(false);
    let lpx: bigint = -9223372036854775808n; //long.min

    let index = -1;
    let i = 0;
    for (const path of paths) {
      for (let j = 0, len = path.length; j < len; j++) {
        const ptX = path.getX(j);
        const ptY = path.getY(j);
        if (ptY >= rec.bottom) {
          if (ptY > rec.bottom || ptX < lpx) {
            index = i;
            lpx = ptX;
            rec.bottom = ptY;
          }
        } else if (ptY < rec.top) {
          rec.top = ptY;
        }

        if (ptX > rec.right) {
          rec.right = ptX;
        } else if (ptX < rec.left) {
          rec.left = ptX;
        }
      }
      i++;
    }
    return { rec: rec, index: index };
  }

  translatePoint(pt: PointD, dx: number, dy: number): PointD {
    return { x: pt.x + dx, y: pt.y + dy };
  }

  reflectPoint(pt: PointD, pivot: PointD): PointD {
    return { x: pivot.x + (pivot.x - pt.x), y: pivot.y + (pivot.y - pt.y) };
  }

  almostZero(value: number, epsilon = 0.001): boolean {
    return Math.abs(value) < epsilon;
  }

  hypotenuse(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
  }

  normalizeVector(vec: PointD): PointD {
    const h = this.hypotenuse(vec.x, vec.y);
    if (this.almostZero(h)) {
      return { x: 0, y: 0 };
    }
    const inverseHypot = 1 / h;

    return { x: vec.x * inverseHypot, y: vec.y * inverseHypot };
  }

  getAvgUnitVector(vec1: PointD, vec2: PointD) {
    return this.normalizeVector({ x: vec1.x + vec2.x, y: vec1.y + vec2.y });
  }

  intersectPoint(
    pt1a: PointD,
    pt1b: PointD,
    pt2a: PointD,
    pt2b: PointD,
  ): PointD {
    if (isAlmostZero(pt1a.x - pt1b.x)) {
      if (isAlmostZero(pt2a.x - pt2b.x)) {
        return { x: 0, y: 0 };
      }
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      return { x: pt1a.x, y: m2 * pt1a.x + b2 };
    }

    if (isAlmostZero(pt2a.x - pt2b.x)) {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      return { x: pt2a.x, y: m1 * pt2a.x + b1 };
    } else {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      if (isAlmostZero(m1 - m2)) {
        return { x: 0, y: 0 };
      }
      const x = (b2 - b1) / (m1 - m2);
      return { x: x, y: m1 * x + b1 };
    }
  }

  getPerpendic(pt: Point64, norm: PointD): Point64 {
    return {
      x: pt.x + numberToBigInt(norm.x * this._groupDelta),
      y: pt.y + numberToBigInt(norm.y * this._groupDelta),
    };
  }

  getPerpendicD(pt: Point64, norm: PointD): PointD {
    return {
      x: Number(pt.x) + norm.x * this._groupDelta,
      y: Number(pt.y) + norm.y * this._groupDelta,
    };
  }

  doBevel(group: ClipperGroup, path: IPath64, j: number, k: number): void {
    if (j == k) {
      const absDelta = Math.abs(this._groupDelta);
      group.outPath.push({
        x: path.getX(j) - numberToBigInt(absDelta * this._normals.getX(j)),
        y: path.getY(j) - numberToBigInt(absDelta * this._normals.getY(j)),
      });
      group.outPath.push({
        x: path.getX(j) + numberToBigInt(absDelta * this._normals.getX(j)),
        y: path.getY(j) + numberToBigInt(absDelta * this._normals.getY(j)),
      });
    } else {
      group.outPath.push({
        x:
          path.getX(j) +
          numberToBigInt(this._groupDelta * this._normals.getX(k)),
        y:
          path.getY(j) +
          numberToBigInt(this._groupDelta * this._normals.getY(k)),
      });
      group.outPath.push({
        x:
          path.getX(j) +
          numberToBigInt(this._groupDelta * this._normals.getX(j)),
        y:
          path.getY(j) +
          numberToBigInt(this._groupDelta * this._normals.getY(j)),
      });
    }
  }

  doSquare(group: ClipperGroup, path: IPath64, j: number, k: number): void {
    let vec: PointD;
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);

    if (j === k) {
      vec = { x: jNormalPt.y, y: -jNormalPt.x };
    } else {
      vec = this.getAvgUnitVector(
        { x: -kNormalPt.y, y: kNormalPt.x },
        { x: jNormalPt.y, y: -jNormalPt.x },
      );
    }

    const absDelta = Math.abs(this._groupDelta);

    let ptQ: PointD = { x: Number(path.getX(j)), y: Number(path.getY(j)) };
    ptQ = this.translatePoint(ptQ, absDelta * vec.x, absDelta * vec.y);

    const pt1 = this.translatePoint(
      ptQ,
      this._groupDelta * vec.y,
      this._groupDelta * -vec.x,
    );
    const pt2 = this.translatePoint(
      ptQ,
      this._groupDelta * -vec.y,
      this._groupDelta * vec.x,
    );
    const pt3 = this.getPerpendicD(path.getClone(k), kNormalPt);

    if (j === k) {
      const pt4 = {
        x: pt3.x + vec.x * this._groupDelta,
        y: pt3.y + vec.y * this._groupDelta,
      };

      const pt = this.intersectPoint(pt1, pt2, pt3, pt4);
      const rPt = this.reflectPoint(pt, ptQ);
      group.outPath.push({
        x: numberToBigInt(rPt.x),
        y: numberToBigInt(rPt.y),
      });
      group.outPath.push({
        x: numberToBigInt(pt.x),
        y: numberToBigInt(pt.y),
      });
    } else {
      const pt4 = this.getPerpendicD(path.getClone(j), kNormalPt);
      const pt = this.intersectPoint(pt1, pt2, pt3, pt4);

      group.outPath.push({
        x: numberToBigInt(pt.x),
        y: numberToBigInt(pt.y),
      });

      const rPt = this.reflectPoint(pt, ptQ);
      group.outPath.push({
        x: numberToBigInt(rPt.x),
        y: numberToBigInt(rPt.y),
      });
    }
  }

  doMiter(
    group: ClipperGroup,
    path: IPath64,
    j: number,
    k: number,
    cosA: number,
  ) {
    const q = this._groupDelta / (cosA + 1);
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    group.outPath.push({
      x: path.getX(j) + numberToBigInt((kNormalPt.x + jNormalPt.x) * q),
      y: path.getY(j) + numberToBigInt((kNormalPt.y + jNormalPt.y) * q),
    });
  }

  doRound(
    group: ClipperGroup,
    path: IPath64,
    j: number,
    k: number,
    angle: number,
  ) {
    if (this.deltaCallback !== undefined) {
      const absDelta = Math.abs(this._groupDelta);
      const arcTol =
        this.arcTolerance > 0.01
          ? this.arcTolerance
          : Math.log10(2 + absDelta) * defaultArcTolerance;
      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this._stepSin = Math.sin((2 * Math.PI) / stepsPer360);
      this._stepCos = Math.cos((2 * Math.PI) / stepsPer360);
      if (this._groupDelta < 0.0) {
        this._stepSin = -this._stepSin;
      }
      this._stepsPerRad = stepsPer360 / (2 * Math.PI);
    }

    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    const pt = path.getClone(j);
    let offsetVec = {
      x: kNormalPt.x * this._groupDelta,
      y: kNormalPt.y * this._groupDelta,
    };

    if (j === k) {
      offsetVec.x = -offsetVec.x;
      offsetVec.y = -offsetVec.y;
    }

    group.outPath.push({
      x: pt.x + numberToBigInt(offsetVec.x),
      y: pt.y + numberToBigInt(offsetVec.y),
    });

    const steps = Math.ceil(this._stepsPerRad * Math.abs(angle));

    for (let i = 1; i < steps; i++) {
      offsetVec = {
        x: offsetVec.x * this._stepCos - this._stepSin * offsetVec.y,
        y: offsetVec.x * this._stepSin + offsetVec.y * this._stepCos,
      };

      group.outPath.push({
        x: pt.x + numberToBigInt(offsetVec.x),
        y: pt.y + numberToBigInt(offsetVec.y),
      });
    }

    group.outPath.push(this.getPerpendic(pt, jNormalPt));
  }

  bulidNormals(path: IPath64) {
    const cnt = path.length;
    this._normals.clear();

    for (let i = 0; i < cnt - 1; i++) {
      this._normals.push(
        this.getUnitNormal(path.getClone(i), path.getClone(i + 1)),
      );
    }
    this._normals.push(
      this.getUnitNormal(path.getClone(cnt - 1), path.getClone(0)),
    );
  }

  offsetPoint(
    group: ClipperGroup,
    path: IPath64,
    j: number,
    k: number,
  ): number {
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    let sinA = crossProductD(jNormalPt, kNormalPt);
    const cosA = dotProductD(jNormalPt, kNormalPt);
    if (sinA > 1.0) {
      sinA = 1.0;
    } else if (sinA < -1.0) {
      sinA = -1.0;
    }

    if (this.deltaCallback !== undefined) {
      this._groupDelta = this.deltaCallback(path, this._normals, j, k);
      if (group.pathsReversed) {
        this._groupDelta = -this._groupDelta;
      }
    }

    const jPath = path.getClone(j);

    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(jPath);
      return k;
    }

    if (cosA > -0.99 && sinA * this._groupDelta < 0) {
      group.outPath.push(this.getPerpendic(jPath, kNormalPt));
      group.outPath.push(jPath);
      group.outPath.push(this.getPerpendic(jPath, jNormalPt));
    } else if (cosA > 0.999) {
      this.doMiter(group, path, j, k, cosA);
    } else if (this._joinType === JoinType.Miter) {
      if (cosA > this._mitLimSqr - 1) {
        this.doMiter(group, path, j, k, cosA);
      } else {
        this.doSquare(group, path, j, k);
      }
    } else if (cosA > 0.99 || this._joinType === JoinType.Bevel) {
      this.doBevel(group, path, j, k);
    } else if (this._joinType === JoinType.Round) {
      this.doRound(group, path, j, k, Math.atan2(sinA, cosA));
    } else {
      this.doSquare(group, path, j, k);
    }

    return j;
  }

  offsetPolygon(group: ClipperGroup, path: IPath64) {
    const a = area(path);
    if (a < 0 !== this._groupDelta < 0) {
      const rec = getBounds(path);
      const offsetMinDim = Math.abs(this._groupDelta) * 2;
      if (offsetMinDim > rec.width || offsetMinDim > rec.height) {
        return;
      }
    }

    const cnt = path.length;
    group.outPath = new Path64TypedArray(cnt + 1);
    let prev = cnt - 1;

    for (let i = 0; i < cnt; i++) {
      prev = this.offsetPoint(group, path, i, prev);
    }
    group.outPaths.push(group.outPath);
  }

  offsetOpenJoined(group: ClipperGroup, path: IPath64) {
    this.offsetPolygon(group, path);
    path = reversePath(path);
    this.bulidNormals(path);
    this.offsetPolygon(group, path);
  }

  offsetOpenPath(group: ClipperGroup, path: IPath64) {
    group.outPath = new Path64TypedArray();
    const highI = path.length - 1;

    if (this.deltaCallback !== undefined) {
      this._groupDelta = this.deltaCallback(path, this._normals, 0, 0);
    }

    const startPt = path.getClone(0);
    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(startPt);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          this.doBevel(group, path, 0, 0);
          break;
        case EndType.Round:
          this.doRound(group, path, 0, 0, Math.PI);
          break;
        default:
          this.doSquare(group, path, 0, 0);
          break;
      }
    }

    for (let i = 1, k = 0; i < highI; i++) {
      k = this.offsetPoint(group, path, i, k);
    }

    for (let i = highI; i > 0; i--) {
      const nextPt = this._normals.getClone(i - 1);
      this._normals.set(i, -nextPt.x, -nextPt.y);
    }
    const highNormalPt = this._normals.getClone(highI);
    this._normals.set(0, highNormalPt.x, highNormalPt.y);

    if (this.deltaCallback !== undefined) {
      this._groupDelta = this.deltaCallback(path, this._normals, highI, highI);
    }

    const highPt = path.getClone(highI);
    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(highPt);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          this.doBevel(group, path, highI, highI);
          break;
        case EndType.Round:
          this.doRound(group, path, highI, highI, Math.PI);
          break;
        default:
          this.doSquare(group, path, highI, highI);
          break;
      }
    }

    for (let i = highI, k = 0; i > 0; i--) {
      k = this.offsetPoint(group, path, i, k);
    }
    group.outPaths.push(group.outPath);
  }

  doGroupOffset(group: ClipperGroup) {
    if (group.endType === EndType.Polygon) {
      const { index: lowestIdx } = this.getBoundsAndLowestPolyIdx(
        group.inPaths,
      );
      if (lowestIdx < 0) {
        return;
      }

      const calcedArea = area(group.inPaths[lowestIdx]);

      group.pathsReversed = calcedArea < 0;

      if (group.pathsReversed) {
        this._groupDelta = -this._delta;
      } else {
        this._groupDelta = this._delta;
      }
    } else {
      group.pathsReversed = false;
      this._groupDelta = Math.abs(this._delta) * 0.5;
    }

    const absDelta = Math.abs(this._groupDelta);
    this._joinType = group.joinType;
    this._endType = group.endType;

    if (
      this.deltaCallback === undefined &&
      (group.joinType === JoinType.Round || group.endType === EndType.Round)
    ) {
      const arcTol =
        this.arcTolerance > 0.01
          ? this.arcTolerance
          : Math.log10(2 + absDelta) * defaultArcTolerance;

      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this._stepSin = Math.sin((2 * Math.PI) / stepsPer360);
      this._stepCos = Math.cos((2 * Math.PI) / stepsPer360);
      if (this._groupDelta < 0) {
        this._stepSin = -this._stepSin;
      }
      this._stepsPerRad = stepsPer360 / (2 * Math.PI);
    }

    const isJoined =
      group.endType === EndType.Joined || group.endType === EndType.Polygon;

    for (const p of group.inPaths) {
      const path = stripDuplicates(p, isJoined);
      const cnt = path.length;
      if (cnt === 0 || (cnt < 3 && this._endType === EndType.Polygon)) {
        continue;
      }

      if (cnt === 1) {
        group.outPath = new Path64TypedArray();
        const startPt = path.getClone(0);
        if (group.endType === EndType.Round) {
          const r = absDelta;
          const steps = Math.ceil(this._stepsPerRad * 2 * Math.PI);
          group.outPath = ellipse(startPt, r, r, steps);
        } else {
          const d = BigInt(Math.ceil(this._groupDelta));
          const r = new Rect64(
            startPt.x - d,
            startPt.y - d,
            startPt.x - d,
            startPt.y - d,
          );
          group.outPath = r.asPath();
        }
        group.outPaths.push(group.outPath);
      } else {
        if (cnt == 2 && group.endType === EndType.Joined) {
          if (group.joinType === JoinType.Round) {
            this._endType = EndType.Round;
          } else {
            this._endType = EndType.Square;
          }
        }
        this.bulidNormals(path);
        if (this._endType === EndType.Polygon) {
          this.offsetPolygon(group, path);
        } else if (this._endType === EndType.Joined) {
          this.offsetOpenJoined(group, path);
        } else {
          this.offsetOpenPath(group, path);
        }
      }
    }

    for (const path of group.outPaths) {
      this._solution.push(path);
    }

    group.outPaths.clear();
  }
}
