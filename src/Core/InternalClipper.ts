import { Path64 } from "./Path64";
import { Point64 } from "./Point64";
import { PointD } from "./PointD";
import { PointInPolygonResult } from "../Engine/EngineEnums";
import { numberToBigInt } from "../Clipper";

const floatingPointTolerance = 1e-12;

export const defaultArcTolerance = 0.25;
export const checkPrecision = (precision: number) => {
  if (precision < -8 || precision > 8) {
    throw new Error("todo: change message");
  }
};

export const isAlmostZero = (value: number): boolean =>
  Math.abs(value) <= floatingPointTolerance;

export function crossProduct64(
  pt1: Point64,
  pt2: Point64,
  pt3: Point64,
): number {
  return Number(
    (pt2.x - pt1.x) * (pt3.y - pt2.y) - (pt2.y - pt1.y) * (pt3.x - pt2.x),
  );
}

export function crossProductD(vec1: PointD, vec2: PointD): number {
  return vec1.y * vec2.x - vec2.y * vec1.x;
}

export function dotProduct64(pt1: Point64, pt2: Point64, pt3: Point64): number {
  return (
    Number((pt2.x - pt1.x) * (pt3.x - pt2.x)) +
    Number((pt2.y - pt1.y) * (pt3.y - pt2.y))
  );
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
    return { result: true, ip: Point64.clone(ln1a) };
  } else if (t >= 1.0) {
    return { result: true, ip: Point64.clone(ln1b) };
  } else {
    return {
      result: true,
      ip: {
        x: numberToBigInt(Number(ln1a.x) + t * dx1),
        y: numberToBigInt(Number(ln1a.y) + t * dy1),
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
    if (res1 * res2 > 0) return false;
    const res3 = crossProduct64(seg2a, seg1a, seg1b);
    const res4 = crossProduct64(seg2b, seg1a, seg1b);
    if (res3 * res4 > 0) return false;
    return res1 !== 0 || res2 !== 0 || res3 !== 0 || res4 !== 0;
  } else {
    return (
      crossProduct64(seg1a, seg2a, seg2b) *
        crossProduct64(seg1b, seg2a, seg2b) <
        0 &&
      crossProduct64(seg2a, seg1a, seg1b) *
        crossProduct64(seg2b, seg1a, seg1b) <
        0
    );
  }
};

export const getClosestPtOnSegment = (
  offPt: Point64,
  seg1: Point64,
  seg2: Point64,
): Point64 => {
  if (seg1.x === seg2.x && seg1.y === seg2.y) return Point64.clone(seg1);
  const dx = Number(seg2.x - seg1.x);
  const dy = Number(seg2.y - seg1.y);
  const q =
    (Number(offPt.x - seg1.x) * dx + Number(offPt.y - seg1.y) * dy) /
    (dx * dx + dy * dy);
  if (q < 0) {
    return Point64.clone(seg1);
  } else if (q > 1) {
    return Point64.clone(seg2);
  }
  return {
    x: numberToBigInt(Number(seg1.x) + q * dx),
    y: numberToBigInt(Number(seg1.y) + q * dy),
  };
};

export const pointInPolygon = (
  pt: Point64,
  polygon: Path64,
): PointInPolygonResult => {
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
      d = crossProduct64(prev, curr, pt);
      if (d === 0) {
        return PointInPolygonResult.IsOn;
      }
      if (d < 0 === isAbove) {
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

    if (i === 0) {
      d = crossProduct64(polygon[len - 1], polygon[0], pt);
    } else {
      d = crossProduct64(polygon[i - 1], polygon[i], pt);
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
};

export const InternalClipper = {
  getClosestPtOnSegment,
  pointInPolygon,
} as const;
