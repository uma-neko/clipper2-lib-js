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
import { Path64 } from "../Core/Path64";
import { PathD } from "../Core/PathD";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";
import { Rect64 } from "../Core/Rect64";
import { Clipper64 } from "../Engine/Clipper64";
import { PolyTree64 } from "../Engine/PolyTree64";

export type DeltaCallback64 = (
  path: Path64,
  path_norms: PathD,
  currPt: number,
  prevPt: number,
) => number;

const tolerance = 1.0e-12;

export class ClipperOffset {
  _groupList: ClipperGroup[];
  _normals: PathD;
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
    this._normals = new PathD();
    this._solution = new Paths64();
    this._groupDelta = 0;
    this._delta = 0;
    this._mitLimSqr = 0;
    this._stepsPerRad = 0;
    this._stepSin = 0;
    this._stepCos = 0;
    this._joinType = JoinType.Square;
    this._endType = EndType.Polygon;
  }

  clear() {
    this._groupList.length = 0;
  }

  addPath(path: Path64, joinType: JoinType, endType: EndType) {
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
          this._solution.pushRange([path]);
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

    const f = 1.0 / Math.sqrt(Number(dx * dx) + Number(dy * dy));

    dx *= f;
    dy *= f;

    return { x: dy, y: -dx };
  }

  getBoundsAndLowestPolyIdx(paths: Paths64): { index: number; rec: Rect64 } {
    const rec = new Rect64(false);
    let lpx: bigint = -9223372036854775808n; //long.min

    let index = -1;

    for (const indexedPath of paths.map((path, i) => ({ path, i }))) {
      const { path, i } = indexedPath;
      for (const pt of path) {
        if (pt.y >= rec.bottom) {
          if (pt.y > rec.bottom || pt.x < lpx) {
            index = i;
            lpx = pt.x;
            rec.bottom = pt.y;
          }
        } else if (pt.y < rec.top) {
          rec.top = pt.y;
        }

        if (pt.x > rec.right) {
          rec.right = pt.x;
        } else if (pt.x < rec.left) {
          rec.left = pt.x;
        }
      }
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
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
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
      x: numberToBigInt(Number(pt.x) + norm.x * this._groupDelta),
      y: numberToBigInt(Number(pt.y) + norm.y * this._groupDelta),
    };
  }

  getPerpendicD(pt: Point64, norm: PointD): PointD {
    return {
      x: Number(pt.x) + norm.x * this._groupDelta,
      y: Number(pt.y) + norm.y * this._groupDelta,
    };
  }

  doSquare(group: ClipperGroup, path: Path64, j: number, k: number): void {
    let vec: PointD;
    if (j === k) {
      vec = { x: this._normals[j].y, y: -this._normals[j].x };
    } else {
      vec = this.getAvgUnitVector(
        { x: -this._normals[k].y, y: this._normals[k].x },
        { x: this._normals[j].y, y: -this._normals[j].x },
      );
    }

    const absDelta = Math.abs(this._groupDelta);

    let ptQ: PointD = { x: Number(path[j].x), y: Number(path[j].y) };
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
    const pt3 = this.getPerpendicD(path[k], this._normals[k]);

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
      const pt4 = this.getPerpendicD(path[j], this._normals[k]);
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
    path: Path64,
    j: number,
    k: number,
    cosA: number,
  ) {
    const q = this._groupDelta / (cosA + 1);
    group.outPath.push({
      x: numberToBigInt(
        Number(path[j].x) + (this._normals[k].x + this._normals[j].x) * q,
      ),
      y: numberToBigInt(
        Number(path[j].y) + (this._normals[k].y + this._normals[j].y) * q,
      ),
    });
  }

  doRound(
    group: ClipperGroup,
    path: Path64,
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

    const pt = path[j];
    let offsetVec = {
      x: this._normals[k].x * this._groupDelta,
      y: this._normals[k].y * this._groupDelta,
    };

    if (j === k) {
      offsetVec.x = -offsetVec.x;
      offsetVec.y = -offsetVec.y;
    }

    group.outPath.push({
      x: numberToBigInt(Number(pt.x) + offsetVec.x),
      y: numberToBigInt(Number(pt.y) + offsetVec.y),
    });

    const steps = Math.ceil(this._stepsPerRad * Math.abs(angle));

    for (let i = 1; i < steps; i++) {
      offsetVec = {
        x: offsetVec.x * this._stepCos - this._stepSin * offsetVec.y,
        y: offsetVec.x * this._stepSin + offsetVec.y * this._stepCos,
      };

      group.outPath.push({
        x: numberToBigInt(Number(pt.x) + offsetVec.x),
        y: numberToBigInt(Number(pt.y) + offsetVec.y),
      });
    }

    group.outPath.push(this.getPerpendic(pt, this._normals[j]));
  }

  bulidNormals(path: Path64) {
    const cnt = path.length;
    this._normals.clear();

    for (let i = 0; i < cnt - 1; i++) {
      this._normals.push(this.getUnitNormal(path[i], path[i + 1]));
    }
    this._normals.push(this.getUnitNormal(path[cnt - 1], path[0]));
  }

  offsetPoint(group: ClipperGroup, path: Path64, j: number, k: number): number {
    let sinA = crossProductD(this._normals[j], this._normals[k]);
    const cosA = dotProductD(this._normals[j], this._normals[k]);
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

    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(path[j]);
      return k;
    }

    if (cosA > -0.99 && sinA * this._groupDelta < 0) {
      group.outPath.push(this.getPerpendic(path[j], this._normals[k]));
      group.outPath.push(path[j]);
      group.outPath.push(this.getPerpendic(path[j], this._normals[j]));
    } else if (cosA > 0.999) {
      this.doMiter(group, path, j, k, cosA);
    } else if (this._joinType === JoinType.Miter) {
      if (cosA > this._mitLimSqr - 1) {
        this.doMiter(group, path, j, k, cosA);
      } else {
        this.doSquare(group, path, j, k);
      }
    } else if (cosA > 0.99 || this._joinType === JoinType.Square) {
      this.doSquare(group, path, j, k);
    } else {
      this.doRound(group, path, j, k, Math.atan2(sinA, cosA));
    }

    return j;
  }

  offsetPolygon(group: ClipperGroup, path: Path64) {
    const a = area(path);
    if (a < 0 !== this._groupDelta < 0) {
      const rec = getBounds(path);
      const offsetMinDim = Math.abs(this._groupDelta) * 2;
      if (offsetMinDim > rec.width || offsetMinDim > rec.height) {
        return;
      }
    }

    group.outPath = new Path64();
    const cnt = path.length;
    let prev = cnt - 1;

    for (let i = 0; i < cnt; i++) {
      prev = this.offsetPoint(group, path, i, prev);
    }
    group.outPaths.push(group.outPath);
  }

  offsetOpenJoined(group: ClipperGroup, path: Path64) {
    this.offsetPolygon(group, path);
    path = reversePath(path);
    this.bulidNormals(path);
    this.offsetPolygon(group, path);
  }

  offsetOpenPath(group: ClipperGroup, path: Path64) {
    group.outPath = new Path64();
    const highI = path.length - 1;

    if (this.deltaCallback !== undefined) {
      this._groupDelta = this.deltaCallback(path, this._normals, 0, 0);
    }

    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(path[0]);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          group.outPath.push({
            x: numberToBigInt(
              Number(path[0].x) - this._normals[0].x * this._groupDelta,
            ),
            y: numberToBigInt(
              Number(path[0].y) - this._normals[0].y * this._groupDelta,
            ),
          });
          group.outPath.push(this.getPerpendic(path[0], this._normals[0]));
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
      this._normals[i] = {
        x: -this._normals[i - 1].x,
        y: -this._normals[i - 1].y,
      };
    }
    this._normals[0] = this._normals[highI];

    if (this.deltaCallback !== undefined) {
      this._groupDelta = this.deltaCallback(path, this._normals, highI, highI);
    }

    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(path[highI]);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          group.outPath.push({
            x: numberToBigInt(
              Number(path[highI].x) - this._normals[highI].x * this._groupDelta,
            ),
            y: numberToBigInt(
              Number(path[highI].y) - this._normals[highI].y * this._groupDelta,
            ),
          });
          group.outPath.push(
            this.getPerpendic(path[highI], this._normals[highI]),
          );
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
        group.outPath = new Path64();
        if (group.endType === EndType.Round) {
          const r = absDelta;
          const steps = Math.ceil(this._stepsPerRad * 2 * Math.PI);
          group.outPath = ellipse(path[0], r, r, steps);
        } else {
          const d = Math.ceil(this._groupDelta);
          const r = new Rect64(
            numberToBigInt(Number(path[0].x) - d),
            numberToBigInt(Number(path[0].y) - d),
            numberToBigInt(Number(path[0].x) - d),
            numberToBigInt(Number(path[0].y) - d),
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
