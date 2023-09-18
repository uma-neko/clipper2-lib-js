import { PointInPolygonResult } from "../Engine/EngineEnums";
import { Path64 } from "./Path64";
import { Point64 } from "./Point64";
import { PointD } from "./PointD";

type CrossProduct = {
  (pt1: Point64, pt2: Point64, pt3: Point64): number;
  (vec1: PointD, vec2: PointD): number;
};

const crossProduct: CrossProduct = (pt1OrVec1, pt2OrVec2, pt3?: Point64) => {
  if (
    typeof pt1OrVec1.x === "number" &&
    typeof pt1OrVec1.y === "number" &&
    typeof pt2OrVec2.x === "number" &&
    typeof pt2OrVec2.y === "number"
  ) {
    return pt1OrVec1.y * pt2OrVec2.x - pt2OrVec2.y * pt1OrVec1.x;
  } else if (
    typeof pt1OrVec1.x === "bigint" &&
    typeof pt1OrVec1.y === "bigint" &&
    typeof pt2OrVec2.x === "bigint" &&
    typeof pt2OrVec2.y === "bigint" &&
    pt3 !== undefined &&
    typeof pt3.x === "bigint" &&
    typeof pt3.y === "bigint"
  ) {
    return (
      Number((pt2OrVec2.x - pt1OrVec1.x) * (pt3.y - pt2OrVec2.y)) -
      Number((pt2OrVec2.y - pt1OrVec1.y) * (pt3.x - pt2OrVec2.x))
    );
  }
  throw new Error("todo: change message");
};

type DotProduct = {
  (vec1: PointD, vec2: PointD): number;
  (pt1: Point64, pt2: Point64, pt3: Point64): number;
};
const dotProduct: DotProduct = (pt1OrVec1, pt2OrVec2, pt3?: Point64) => {
  if (
    typeof pt1OrVec1.x === "number" &&
    typeof pt1OrVec1.y === "number" &&
    typeof pt2OrVec2.x === "number" &&
    typeof pt2OrVec2.y === "number"
  ) {
    return pt1OrVec1.x * pt2OrVec2.x + pt1OrVec1.y * pt2OrVec2.y;
  } else if (
    typeof pt1OrVec1.x === "bigint" &&
    typeof pt1OrVec1.y === "bigint" &&
    typeof pt2OrVec2.x === "bigint" &&
    typeof pt2OrVec2.y === "bigint" &&
    pt3 !== undefined &&
    typeof pt3.x === "bigint" &&
    typeof pt3.y === "bigint"
  ) {
    return (
      Number((pt2OrVec2.x - pt1OrVec1.x) * (pt3.x - pt2OrVec2.x)) +
      Number((pt2OrVec2.y - pt1OrVec1.y) * (pt3.y - pt2OrVec2.y))
    );
  }
  throw new Error("todo: change message");
};

const floatingPointTolerance = 1e-12;

export const InternalClipper = {
  defaultArcTolerance: 0.25,
  checkPrecision: (precision: number) => {
    if (precision < -8 || precision > 8) {
      throw new Error("todo: change message");
    }
  },
  isAlmostZero: (value: number): boolean =>
    Math.abs(value) <= floatingPointTolerance,
  crossProduct: crossProduct,
  dotProduct: dotProduct,
  getIntersectPt(
    ln1a: Point64,
    ln1b: Point64,
    ln2a: Point64,
    ln2b: Point64,
  ): Point64 | undefined {
    const dy1 = Number(ln1b.y - ln1a.y);
    const dx1 = Number(ln1b.x - ln1a.x);
    const dy2 = Number(ln2b.y - ln2a.y);
    const dx2 = Number(ln2b.x - ln2a.x);
    const det = dy1 * dx2 - dy2 * dx1;
    if (det == 0.0) {
      return undefined;
    }

    const t =
      (Number(ln1a.x - ln2a.x) * dy2 - Number(ln1a.y - ln2a.y) * dx2) / det;
    if (t <= 0.0) return { x: ln1a.x, y: ln1a.y };
    else if (t >= 1.0) return { x: ln1b.x, y: ln1b.y };
    else
      return {
        x: ln1a.x + BigInt(Math.round(t * dx1)),
        y: ln1a.y + BigInt(Math.round(t * dy1)),
      };
  },
  getIntersectPoint(
    ln1a: Point64,
    ln1b: Point64,
    ln2a: Point64,
    ln2b: Point64,
  ): { result: boolean; ip: Point64 } {
    const dy1 = Number(ln1b.y - ln1a.y);
    const dx1 = Number(ln1b.x - ln1a.x);
    const dy2 = Number(ln2b.y - ln2a.y);
    const dx2 = Number(ln2b.x - ln2a.x);
    const det = dy1 * dx2 - dy2 * dx1;
    if (det == 0.0) {
      return { result: false, ip: { x: 0n, y: 0n } };
    }

    const t =
      (Number(ln1a.x - ln2a.x) * dy2 - Number(ln1a.y - ln2a.y) * dx2) / det;
    if (t <= 0.0) {
      return { result: true, ip: { x: ln1a.x, y: ln1a.y } };
    } else if (t >= 1.0) {
      return { result: true, ip: { x: ln2a.x, y: ln2a.y } };
    } else {
      return {
        result: true,
        ip: {
          x: ln1a.x + BigInt(Math.round(t * dx1)),
          y: ln1a.y + BigInt(Math.round(t * dy1)),
        },
      };
    }
  },
  segsIntersect(
    seg1a: Point64,
    seg1b: Point64,
    seg2a: Point64,
    seg2b: Point64,
    inclusive: boolean = false,
  ): boolean {
    if (inclusive) {
      const res1 = InternalClipper.crossProduct(seg1a, seg2a, seg2b);
      const res2 = InternalClipper.crossProduct(seg1b, seg2a, seg2b);
      if (res1 * res2 > 0) return false;
      const res3 = InternalClipper.crossProduct(seg2a, seg1a, seg1b);
      const res4 = InternalClipper.crossProduct(seg2b, seg1a, seg1b);
      if (res3 * res4 > 0) return false;
      return res1 !== 0 || res2 !== 0 || res3 !== 0 || res4 !== 0;
    } else {
      return (
        InternalClipper.crossProduct(seg1a, seg2a, seg2b) *
          InternalClipper.crossProduct(seg1b, seg2a, seg2b) <
          0 &&
        InternalClipper.crossProduct(seg2a, seg1a, seg1b) *
          InternalClipper.crossProduct(seg2b, seg1a, seg1b) <
          0
      );
    }
  },
  getClosestPtOnSegment(offPt: Point64, seg1: Point64, seg2: Point64): Point64 {
    if (seg1.x === seg2.x && seg1.y === seg2.y) return { x: seg1.x, y: seg1.y };
    const dx = Number(seg2.x - seg1.x);
    const dy = Number(seg2.y - seg1.y);
    let q =
      (Number(offPt.x - seg1.x) * dx + Number(offPt.y - seg1.y) * dy) /
      (dx * dx + dy * dy);
    if (q < 0) {
      q = 0;
    } else if (q > 1) {
      q = 1;
    }
    return {
      x: seg1.x + BigInt(Math.round(q * dx)),
      y: seg1.y + BigInt(Math.round(q * dy)),
    };
  },
  pointInPolygon(pt: Point64, polygon: Path64): PointInPolygonResult {
    const len = polygon.length;
    let start = 0;

    if (len < 3) {
      return PointInPolygonResult.IsOutside;
    }

    while (start < len && polygon[start].y === pt.y) {
      start++;
    }

    if (start === len) {
      return PointInPolygonResult.IsOutside;
    }

    let d = 0;
    let isAbove = polygon[start].y < pt.y;
    const startingAbove = isAbove;
    let val = false;
    let i = start + 1;
    let end = len;

    while (true) {
      if (i === end) {
        if (end === 0 || start === 0) {
          break;
        }
        end = start;
        i = 0;
      }

      if (isAbove) {
        while (i < end && polygon[i].y < pt.y) {
          i++;
        }
        if (i === end) {
          continue;
        }
      } else {
        while (i < end && polygon[i].y > pt.y) {
          i++;
        }
        if (i === end) {
          continue;
        }
      }

      const curr = polygon[i];
      const prev = i > 0 ? polygon[i - 1] : polygon[len - 1];

      if (curr.y === pt.y) {
        if (
          curr.y === pt.x ||
          (curr.y === prev.y && pt.x < prev.x !== pt.x < curr.x)
        ) {
          return PointInPolygonResult.IsOn;
        }

        i++;
        if (i === start) {
          break;
        }
        continue;
      }

      if (!(pt.x < curr.x && pt.x < prev.x)) {
        if (pt.x > prev.x && pt.x > curr.x) {
          val = !val;
        } else {
          d = InternalClipper.crossProduct(prev, curr, pt);
          if (d === 0) {
            return PointInPolygonResult.IsOn;
          }
          if (d < 0 === isAbove) {
            val = !val;
          }
        }
      }
      isAbove = !isAbove;
      i++;
    }

    if (isAbove !== startingAbove) {
      if (i === len) {
        i = 0;
      }

      if (i === 0) {
        d = InternalClipper.crossProduct(polygon[len - 1], polygon[0], pt);
      } else {
        d = InternalClipper.crossProduct(polygon[i - 1], polygon[i], pt);
      }
      if (d === 0) {
        return PointInPolygonResult.IsOn;
      }
      if (d < 0 === isAbove) {
        val = !val;
      }
    }

    if (val) {
      return PointInPolygonResult.IsInside;
    } else {
      return PointInPolygonResult.IsOutside;
    }
  },
} as const;
