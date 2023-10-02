import type { IPath64 } from "./IPath64";
import { Point64 } from "./Point64";
import { PointD } from "./PointD";
import { PointInPolygonResult } from "../Engine/EngineEnums";
import { numberToBigInt, roundToEven } from "../Clipper";

const floatingPointTolerance = 1e-12;

export const defaultArcTolerance = 0.25;
export const checkPrecision = (precision: number) => {
  if (precision < -8 || precision > 8) {
    throw new RangeError("Precision must be between -8 and 8.");
  }
};

export const isAlmostZero = (value: number): boolean =>
  Math.abs(value) <= floatingPointTolerance;

export function crossProduct64(
  pt1: Point64,
  pt2: Point64,
  pt3: Point64,
): bigint {
  return (pt2.x - pt1.x) * (pt3.y - pt2.y) - (pt2.y - pt1.y) * (pt3.x - pt2.x);
}

export function crossProductD(vec1: PointD, vec2: PointD): number {
  return vec1.y * vec2.x - vec2.y * vec1.x;
}

export function dotProduct64(pt1: Point64, pt2: Point64, pt3: Point64): bigint {
  return (pt2.x - pt1.x) * (pt3.x - pt2.x) + (pt2.y - pt1.y) * (pt3.y - pt2.y);
}

export function dotProductD(vec1: PointD, vec2: PointD): number {
  return vec1.x * vec2.x + vec1.y * vec2.y;
}

export const getIntersectPoint = (
  ln1a: Point64,
  ln1b: Point64,
  ln2a: Point64,
  ln2b: Point64,
): { result: boolean; ip: Point64 } => {
  const dy1 = ln1b.y - ln1a.y;
  const dx1 = ln1b.x - ln1a.x;
  const dy2 = ln2b.y - ln2a.y;
  const dx2 = ln2b.x - ln2a.x;
  const det = dy1 * dx2 - dy2 * dx1;
  if (det === 0n) {
    return { result: false, ip: { x: 0n, y: 0n } };
  }

  const t =
    Number((ln1a.x - ln2a.x) * dy2 - (ln1a.y - ln2a.y) * dx2) / Number(det);
  if (t <= 0.0) {
    return { result: true, ip: Point64.clone(ln1a) };
  } else if (t >= 1.0) {
    return { result: true, ip: Point64.clone(ln1b) };
  } else {
    return {
      result: true,
      ip: {
        x: ln1a.x + numberToBigInt(t * Number(dx1)),
        y: ln1a.y + numberToBigInt(t * Number(dy1)),
      },
    };
  }
};

export const segsIntersect = (
  seg1a: Point64,
  seg1b: Point64,
  seg2a: Point64,
  seg2b: Point64,
  inclusive: boolean = false,
): boolean => {
  if (inclusive) {
    const res1 = crossProduct64(seg1a, seg2a, seg2b);
    const res2 = crossProduct64(seg1b, seg2a, seg2b);
    if (res1 * res2 > 0n) return false;
    const res3 = crossProduct64(seg2a, seg1a, seg1b);
    const res4 = crossProduct64(seg2b, seg1a, seg1b);
    if (res3 * res4 > 0n) return false;
    return res1 !== 0n || res2 !== 0n || res3 !== 0n || res4 !== 0n;
  } else {
    return (
      crossProduct64(seg1a, seg2a, seg2b) *
        crossProduct64(seg1b, seg2a, seg2b) <
        0n &&
      crossProduct64(seg2a, seg1a, seg1b) *
        crossProduct64(seg2b, seg1a, seg1b) <
        0n
    );
  }
};

export const getClosestPtOnSegment = (
  offPt: Point64,
  seg1: Point64,
  seg2: Point64,
): Point64 => {
  if (Point64.equals(seg1, seg2)) return Point64.clone(seg1);
  const dx = seg2.x - seg1.x;
  const dy = seg2.y - seg1.y;
  const q =
    Number((offPt.x - seg1.x) * dx + (offPt.y - seg1.y) * dy) /
    Number(dx * dx + dy * dy);
  if (q < 0) {
    return Point64.clone(seg1);
  } else if (q > 1) {
    return Point64.clone(seg2);
  }
  return {
    x: seg1.x + BigInt(roundToEven(q * Number(dx))),
    y: seg1.y + BigInt(roundToEven(q * Number(dy))),
  };
};

export const pointInPolygon = (
  pt: Point64,
  polygon: IPath64,
): PointInPolygonResult => {
  const len = polygon.length;
  let start = 0;

  if (len < 3) {
    return PointInPolygonResult.IsOutside;
  }

  while (start < len && polygon.getY(start) === pt.y) {
    start++;
  }

  if (start === len) {
    return PointInPolygonResult.IsOutside;
  }

  let isAbove = polygon.getY(start) < pt.y;
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
      while (i < end && polygon.getY(i) < pt.y) {
        i++;
      }
      if (i === end) {
        continue;
      }
    } else {
      while (i < end && polygon.getY(i) > pt.y) {
        i++;
      }
      if (i === end) {
        continue;
      }
    }

    const curr = polygon.getClone(i);
    const prev = i > 0 ? polygon.getClone(i - 1) : polygon.getClone(len - 1);

    if (curr.y === pt.y) {
      if (
        curr.x === pt.x ||
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

    if (pt.x > prev.x && pt.x > curr.x) {
      val = !val;
    } else if (pt.x >= prev.x || pt.x >= curr.x) {
      const d = crossProduct64(prev, curr, pt);
      if (d === 0n) {
        return PointInPolygonResult.IsOn;
      }
      if (d < 0n === isAbove) {
        val = !val;
      }
    }
    isAbove = !isAbove;
    i++;
  }

  if (isAbove !== startingAbove) {
    if (i === len) {
      i = 0;
    }
    let d: bigint;
    if (i === 0) {
      d = crossProduct64(polygon.getClone(len - 1), polygon.getClone(0), pt);
    } else {
      d = crossProduct64(polygon.getClone(i - 1), polygon.getClone(i), pt);
    }
    if (d === 0n) {
      return PointInPolygonResult.IsOn;
    }
    if (d < 0n === isAbove) {
      val = !val;
    }
  }

  if (val) {
    return PointInPolygonResult.IsInside;
  } else {
    return PointInPolygonResult.IsOutside;
  }
};

export const InternalClipper = {
  getClosestPtOnSegment,
  pointInPolygon,
} as const;
