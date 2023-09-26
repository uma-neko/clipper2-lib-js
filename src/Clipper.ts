import { ClipType, FillRule, PathType } from "./Core/CoreEnums";
import {
  checkPrecision,
  isAlmostZero,
  pointInPolygon as internalPointInPolygon,
  crossProduct64,
} from "./Core/InternalClipper";
import { isPath64 } from "./Core/Path64";
import type { Path64Base } from "./Core/Path64Base";
import { Path64TypedArray } from "./Core/Path64TypedArray";
import { PathD, isPathD } from "./Core/PathD";
import { PathDBase } from "./Core/PathDBase";
import { PathDTypedArray } from "./Core/PathDTypedArray";
import { Paths64, isPaths64 } from "./Core/Paths64";
import { PathsD, isPathsD } from "./Core/PathsD";
import { Point64, isPoint64 } from "./Core/Point64";
import { PointD, isPointD } from "./Core/PointD";
import { Rect64, isRect64 } from "./Core/Rect64";
import { RectD, isRectD } from "./Core/RectD";
import { Clipper64 } from "./Engine/Clipper64";
import { ClipperD } from "./Engine/ClipperD";
import { PointInPolygonResult } from "./Engine/EngineEnums";
import { PolyPath64 } from "./Engine/PolyPath64";
import { PolyPathBase } from "./Engine/PolyPathBase";
import { PolyPathD } from "./Engine/PolyPathD";
import { PolyTree64 } from "./Engine/PolyTree64";
import { PolyTreeD } from "./Engine/PolyTreeD";
import { sum, diff } from "./Minkowski/Minkowski";
import { ClipperOffset } from "./Offset/ClipperOffset";
import { EndType, JoinType } from "./Offset/OffsetEnums";
import { RectClip64 } from "./RectClip/RectClip64";
import { RectClipLines64 } from "./RectClip/RectClipLines64";

// If cast double to long, truncated. (ex. 0.5 => 0, 1.5 => 1)
// If use C# round or std::nearbyint, round half to even. (ex. 0.5 => 0, 1.5 => 2)
// If use javascript round, round half toward positive infinity. (ex. 0.5 => 1, -0.5 => 0)

export const roundToEven = (num: number): number => {
  if (Number.isInteger(num)) {
    return num;
  } else if (Number.isInteger(num * 2)) {
    const truncated = Math.trunc(num);
    return truncated + (truncated % 2);
  }
  return awayFromZeroRounding(num);
};

export const awayFromZeroRounding = (num: number): number =>
  num >= 0 ? Math.trunc(num + 0.5) : Math.trunc(num - 0.5);

export function numberToBigInt(num: number): bigint {
  return BigInt(awayFromZeroRounding(num));
}

export function perpendicDistFromLineSqrd(
  pt: Point64,
  line1: Point64,
  line2: Point64,
): number;
export function perpendicDistFromLineSqrd(
  pt: PointD,
  line1: PointD,
  line2: PointD,
): number;
export function perpendicDistFromLineSqrd(
  pt: PointD | Point64,
  line1: PointD | Point64,
  line2: PointD | Point64,
): number;
export function perpendicDistFromLineSqrd<TPoint extends Point64 | PointD>(
  pt: TPoint,
  line1: TPoint,
  line2: TPoint,
): number {
  if (isPoint64(pt) && isPoint64(line1) && isPoint64(line2)) {
    const x2 = line2.x - line1.x;
    const y2 = line2.y - line1.y;
    if (x2 === 0n && y2 === 0n) {
      return 0;
    }
    const x1 = pt.x - line1.x;
    const y1 = pt.y - line1.y;
    return sqr(Number(x1 * y2 - x2 * y1)) / Number(x2 * x2 + y2 * y2);
  } else if (isPointD(pt) && isPointD(line1) && isPointD(line2)) {
    const x2 = line2.x - line1.x;
    const y2 = line2.y - line1.y;
    if (x2 === 0 && y2 === 0) {
      return 0;
    }
    const x1 = pt.x - line1.x;
    const y1 = pt.y - line1.y;
    return sqr(x1 * y2 - x2 * y1) / (x2 * x2 + y2 * y2);
  } else {
    throw new Error("todo: change message");
  }
}

export function sqr(value: number): number {
  return value * value;
}

export function rdp(
  path: Path64Base | PathDBase,
  begin: number,
  end: number,
  epsSqrd: number,
  flags: boolean[],
): void {
  let idx = 0;
  let max_d = 0;
  if (isPath64(path)) {
    const beginPt = path.getClone(begin);
    while (end > begin && Point64.equals(beginPt, path.getClone(end))) {
      flags[end--] = false;
    }

    const endPt = path.get(end);

    for (let i = begin + 1; i < end; i++) {
      const d = perpendicDistFromLineSqrd(path.getClone(i), beginPt, endPt);
      if (d <= max_d) {
        continue;
      }
      max_d = d;
      idx = i;
    }
    if (max_d <= epsSqrd) {
      return;
    }

    flags[idx] = true;
    if (idx > begin + 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
    if (idx < end - 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
  } else if (isPathD(path)) {
    const beginPt = path.getClone(begin);
    while (end > begin && PointD.equals(beginPt, path.getClone(end))) {
      flags[end--] = false;
    }
    const endPt = path.getClone(end);
    for (let i = begin + 1; i < end; i++) {
      const d = perpendicDistFromLineSqrd(path.getClone(i), beginPt, endPt);
      if (d <= max_d) {
        continue;
      }
      max_d = d;
      idx = i;
    }
    if (max_d <= epsSqrd) {
      return;
    }

    flags[idx] = true;
    if (idx > begin + 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
    if (idx < end - 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
  } else {
    throw new TypeError("todo");
  }
}

export const invalidRect64 = () => new Rect64(false);
export const invalidRectD = () => new RectD(false);

export function intersect(
  subject: Paths64,
  clip: Paths64,
  fillRule: FillRule,
): Paths64;
export function intersect(
  subject: PathsD,
  clip: PathsD,
  fillRule: FillRule,
  precision?: number,
): PathsD;
export function intersect(
  subject: Paths64 | PathsD,
  clip: Paths64 | PathsD,
  fillRule: FillRule,
  precision: number = 2,
): Paths64 | PathsD {
  return booleanOp(
    ClipType.Intersection,
    subject,
    clip,
    fillRule,
    precision,
  ) as Paths64 | PathsD;
}

export function union(subject: Paths64, fillRule: FillRule): Paths64;
export function union(
  subject: Paths64,
  clip: Paths64,
  fillRule: FillRule,
): Paths64;
export function union(subject: PathsD, fillRule: FillRule): PathsD;
export function union(
  subject: PathsD,
  clip: PathsD,
  fillRule: FillRule,
  precision?: number,
): PathsD;
export function union(
  subject: Paths64 | PathsD,
  fillRuleOrClip: Paths64 | PathsD | FillRule,
  fillRule?: FillRule,
  precision: number = 2,
): Paths64 | PathsD {
  if (typeof fillRuleOrClip === "number") {
    return booleanOp(
      ClipType.Union,
      subject,
      undefined,
      fillRuleOrClip as FillRule,
      precision,
    ) as Paths64 | PathsD;
  } else {
    return booleanOp(
      ClipType.Union,
      subject,
      fillRuleOrClip,
      fillRule!,
      precision,
    ) as Paths64 | PathsD;
  }
}

export function difference(
  subject: Paths64,
  clip: Paths64,
  fillRule: FillRule,
): Paths64;
export function difference(
  subject: PathsD,
  clip: PathsD,
  fillRule: FillRule,
  precision?: number,
): PathsD;
export function difference(
  subject: Paths64 | PathsD,
  clip: Paths64 | PathsD,
  fillRule: FillRule,
  precision: number = 2,
): Paths64 | PathsD {
  return booleanOp(ClipType.Difference, subject, clip, fillRule, precision) as
    | Paths64
    | PathsD;
}

export function xor(
  subject: Paths64,
  clip: Paths64,
  fillRule: FillRule,
): Paths64;
export function xor(
  subject: PathsD,
  clip: PathsD,
  fillRule: FillRule,
  precision?: number,
): PathsD;
export function xor(
  subject: Paths64 | PathsD,
  clip: Paths64 | PathsD,
  fillRule: FillRule,
  precision: number = 2,
): Paths64 | PathsD {
  return booleanOp(ClipType.Xor, subject, clip, fillRule, precision) as
    | Paths64
    | PathsD;
}

export function booleanOp(
  clipType: ClipType,
  subject: Paths64,
  clip: Paths64 | undefined,
  fillRule: FillRule,
): Paths64;
export function booleanOp(
  clipType: ClipType,
  subject: Paths64,
  clip: Paths64 | undefined,
  polytree: PolyTree64,
  fillRule: FillRule,
): void;
export function booleanOp(
  clipType: ClipType,
  subject: PathsD,
  clip: PathsD | undefined,
  fillRule: FillRule,
  precision?: number,
): PathsD;
export function booleanOp(
  clipType: ClipType,
  subject: PathsD,
  clip: PathsD | undefined,
  polytree: PolyTreeD,
  fillRule: FillRule,
  precision?: number,
): void;
export function booleanOp(
  clipType: ClipType,
  subject: Paths64 | PathsD,
  clip: Paths64 | PathsD | undefined,
  fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD,
  precisionOrFillRule?: number | FillRule,
  precision?: number,
): Paths64 | PathsD | void;
export function booleanOp(
  clipType: ClipType,
  subject: Paths64 | PathsD,
  clip: Paths64 | PathsD | undefined,
  fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD,
  precisionOrFillRule?: number | FillRule,
  precision?: number,
): Paths64 | PathsD | void {
  if (isPaths64(subject) && (clip === undefined || isPaths64(clip))) {
    if (typeof fillRuleOrPolyTree === "number") {
      const solution = new Paths64();
      const c = new Clipper64();
      c.addPaths(subject, PathType.Subject);
      if (clip !== undefined) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, fillRuleOrPolyTree, solution);
      return solution;
    } else if (fillRuleOrPolyTree instanceof PolyTree64) {
      const c = new Clipper64();
      c.addPaths(subject, PathType.Subject);
      if (clip !== undefined) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, precisionOrFillRule! as FillRule, fillRuleOrPolyTree);
      return;
    }
  } else if (isPathsD(subject) && (clip === undefined || isPathsD(clip))) {
    if (typeof fillRuleOrPolyTree === "number") {
      const solution = new PathsD();
      const c = new ClipperD(precisionOrFillRule ?? 2);
      c.addPaths(subject, PathType.Subject);
      if (clip !== undefined) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, fillRuleOrPolyTree, solution);
      return solution;
    } else if (fillRuleOrPolyTree instanceof PolyTreeD) {
      const c = new ClipperD(precision ?? 2);
      c.addPaths(subject, PathType.Subject);
      if (clip !== undefined) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, precisionOrFillRule as FillRule, fillRuleOrPolyTree);
      return;
    }
  }
  throw new Error("todo: change message");
}

export function inflatePaths(
  paths: Paths64,
  delta: number,
  joinType: JoinType,
  endType: EndType,
  miterLimit?: number,
): Paths64;
export function inflatePaths(
  paths: PathsD,
  delta: number,
  joinType: JoinType,
  endType: EndType,
  miterLimit?: number,
  precision?: number,
): PathsD;
export function inflatePaths(
  paths: Paths64 | PathsD,
  delta: number,
  joinType: JoinType,
  endType: EndType,
  miterLimit: number = 2.0,
  precision: number = 2,
): Paths64 | PathsD {
  if (isPaths64(paths)) {
    const co = new ClipperOffset(miterLimit);
    co.addPaths(paths, joinType, endType);
    const solution = new Paths64();
    co.execute(delta, solution);
    return solution;
  } else {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const tmp = scalePaths64(paths, scale);
    const co = new ClipperOffset(miterLimit);
    co.addPaths(tmp, joinType, endType);
    co.execute(delta * scale, tmp);
    return scalePathsD(tmp, 1 / scale);
  }
}

export function rectClip(
  rect: Rect64,
  pathOrpaths: Path64Base | Paths64,
): Paths64;
export function rectClip(
  rect: RectD,
  pathOrPaths: PathDBase | PathsD,
  precision?: number,
): PathsD;
export function rectClip(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | Path64Base | PathsD | PathDBase,
  precision: number = 2,
): Paths64 | PathsD {
  if (isRect64(rect)) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }

    let paths: Paths64;

    if (isPaths64(pathOrPaths)) {
      paths = Paths64.clone(pathOrPaths);
    } else if (isPath64(pathOrPaths)) {
      paths = Paths64.clone([pathOrPaths]);
    } else {
      throw Error("todo: change message");
    }

    const rc = new RectClip64(rect);
    return rc.execute(paths);
  } else {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }

    const scale = Math.pow(10, precision);

    let tmpPath: Paths64;

    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else if (isPathD(pathOrPaths)) {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    } else {
      throw new Error("todo: change message");
    }

    const r = scaleRect(rect, scale);
    const rc = new RectClip64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
}

export function rectClipLines(rect: Rect64, paths: Paths64): Paths64;
export function rectClipLines(rect: Rect64, path: Path64Base): Paths64;
export function rectClipLines(
  rect: RectD,
  paths: PathsD,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: RectD,
  path: PathDBase,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | Path64Base | PathsD | PathDBase,
  precision: number = 2,
): Paths64 | PathsD {
  if (isRect64(rect)) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }

    let paths!: Paths64;

    if (isPaths64(pathOrPaths)) {
      paths = pathOrPaths;
    } else if (isPath64(pathOrPaths)) {
      paths = new Paths64();
      paths.push(pathOrPaths);
    }

    const rc = new RectClipLines64(rect);
    return rc.execute(paths);
  } else if (isRectD(rect)) {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }

    const scale = Math.pow(10, precision);

    let tmpPath!: Paths64;

    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else if (isPathD(pathOrPaths)) {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    }

    const r = scaleRect(rect, scale);
    const rc = new RectClipLines64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
  throw new Error("todo: change message.");
}

export function minkowskiSum(
  pattern: Path64Base | PathDBase,
  path: Path64Base | PathDBase,
  isClosed: boolean,
): Paths64 | PathsD {
  return sum(pattern, path, isClosed);
}

export function minkowskiDiff(
  pattern: Path64Base | PathDBase,
  path: Path64Base | PathDBase,
  isClosed: boolean,
): Paths64 | PathsD {
  return diff(pattern, path, isClosed);
}

export function area(
  pathOrPaths: Path64Base | PathDBase | Paths64 | PathsD,
): number {
  let resultArea = 0;
  if (isPaths64(pathOrPaths) || isPathsD(pathOrPaths)) {
    for (const path of pathOrPaths) {
      resultArea += area(path);
    }
  } else {
    if (pathOrPaths.length < 3) {
      return 0;
    }

    if (isPath64(pathOrPaths)) {
      let prevPt = pathOrPaths.getClone(pathOrPaths.length - 1);
      for (const pt of pathOrPaths.getClones()) {
        resultArea += Number((prevPt.y + pt.y) * (prevPt.x - pt.x));
        prevPt = pt;
      }
    } else if (isPathD(pathOrPaths)) {
      let prevPt = pathOrPaths.getClone(pathOrPaths.length - 1);
      for (const pt of pathOrPaths.getClones()) {
        resultArea += (prevPt.y + pt.y) * (prevPt.x - pt.x);
        prevPt = pt;
      }
    } else {
      throw new TypeError("todo");
    }

    resultArea *= 0.5;
  }

  return resultArea;
}

export function isPositive(poly: Path64Base | PathDBase): boolean {
  return area(poly) >= 0;
}

export function path64ToString(path: Path64Base): string {
  let result = "";
  for (const pt of path) {
    result += Point64.toString(pt);
  }
  return result + "\n";
}

export function paths64ToString(paths: Paths64): string {
  let result = "";
  for (const path of paths) {
    result += path64ToString(path);
  }
  return result;
}

export function pathDToString(path: PathDBase): string {
  let result = "";
  for (const pt of path) {
    result += PointD.toString(pt);
  }
  return result + "\n";
}

export function pathsDToString(paths: PathsD): string {
  let result = "";
  for (const path of paths) {
    result += pathDToString(path);
  }
  return result;
}

export function offsetPath(
  path: Path64Base,
  dx: bigint,
  dy: bigint,
): Path64Base {
  const result: Path64Base = new Path64TypedArray();
  for (const pt of path) {
    result.push({ x: pt.x + dx, y: pt.y + dy });
  }

  return result;
}

export function scalePoint64(pt: Point64, scale: number): Point64 {
  return {
    x: numberToBigInt(Number(pt.x) * scale),
    y: numberToBigInt(Number(pt.y) * scale),
  };
}

export function scalePointD(pt: Point64, scale: number): PointD {
  return {
    x: Number(pt.x) * scale,
    y: Number(pt.y) * scale,
  };
}

export function scaleRect(rec: RectD, scale: number): Rect64 {
  return new Rect64(
    numberToBigInt(Number(rec.left) * scale),
    numberToBigInt(Number(rec.top) * scale),
    numberToBigInt(Number(rec.right) * scale),
    numberToBigInt(Number(rec.bottom) * scale),
  );
}

export function scalePath(path: Path64Base, scale: number): Path64Base;
export function scalePath(path: PathDBase, scale: number): PathDBase;
export function scalePath(
  path: Path64Base | PathDBase,
  scale: number,
): Path64Base | PathDBase {
  if (isPath64(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result: Path64Base = new Path64TypedArray(path.length);

    for (const pt of path.getClones()) {
      result.push({
        x: numberToBigInt(Number(pt.x) * scale),
        y: numberToBigInt(Number(pt.y) * scale),
      });
    }
    return result;
  } else if (isPathD(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result: PathDBase = new PathDTypedArray(path.length);

    for (const pt of path.getClones()) {
      result.push({ x: pt.x * scale, y: pt.y * scale });
    }
    return result;
  }
  throw new Error("todo: change message.");
}

export function scalePaths(paths: Paths64, scale: number): Paths64;
export function scalePaths(paths: PathsD, scale: number): PathsD;
export function scalePaths(
  paths: Paths64 | PathsD,
  scale: number,
): Paths64 | PathsD {
  if (isPaths64(paths)) {
    if (isAlmostZero(scale - 1)) {
      return Paths64.clone(paths);
    }

    const result = new Paths64();

    for (const path of paths) {
      const tmpPath: Path64Base = new Path64TypedArray(path.length);
      for (const pt of path.getClones()) {
        tmpPath.push({
          x: numberToBigInt(Number(pt.x) * scale),
          y: numberToBigInt(Number(pt.y) * scale),
        });
      }
      result.push(tmpPath);
    }

    return result;
  } else if (isPathsD(paths)) {
    if (isAlmostZero(scale - 1)) {
      return PathsD.clone(paths);
    }

    const result = new PathsD();

    for (const path of paths) {
      const tmpPath: PathDBase = new PathDTypedArray(path.length);
      for (const pt of path.getClones()) {
        tmpPath.push({ x: pt.x * scale, y: pt.y * scale });
      }
      result.push(tmpPath);
    }

    return result;
  }
  throw new Error("todo: change message");
}

export function scalePath64(path: PathDBase, scale: number): Path64Base {
  const result: Path64Base = new Path64TypedArray(path.length);
  for (const pt of path.getClones()) {
    result.push({
      x: numberToBigInt(Number(pt.x) * scale),
      y: numberToBigInt(Number(pt.y) * scale),
    });
  }
  return result;
}

export function scalePathD(path: Path64Base, scale: number): PathDBase {
  const result: PathDBase = new PathDTypedArray(path.length);
  for (const pt of path.getClones()) {
    result.push({ x: Number(pt.x) * scale, y: Number(pt.y) * scale });
  }
  return result;
}

export function scalePaths64(paths: PathsD, scale: number): Paths64 {
  const result = new Paths64();
  for (const path of paths) {
    result.push(scalePath64(path, scale));
  }
  return result;
}

export function scalePathsD(paths: Paths64, scale: number): PathsD {
  const result = new PathsD();
  for (const path of paths) {
    result.push(scalePathD(path, scale));
  }
  return result;
}

export function path64(path: PathDBase): Path64Base {
  return scalePath64(path, 1);
}

export function paths64(paths: PathsD): Paths64 {
  return scalePaths64(paths, 1);
}

export function pathD(path: Path64Base): PathDBase {
  return scalePathD(path, 1);
}

export function pathsD(paths: Paths64): PathsD {
  return scalePathsD(paths, 1);
}

export function translatePath(
  path: Path64Base,
  dx: bigint,
  dy: bigint,
): Path64Base;
export function translatePath(
  path: PathDBase,
  dx: number,
  dy: number,
): PathDBase;
export function translatePath(
  path: Path64Base | PathDBase,
  dx: bigint | number,
  dy: bigint | number,
): Path64Base | PathDBase {
  if (isPath64(path) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Path64TypedArray();
    for (const pt of path) {
      result.push({ x: pt.x + dx, y: pt.y + dy });
    }
    return result;
  } else if (
    isPathD(path) &&
    typeof dx === "number" &&
    typeof dy === "number"
  ) {
    const result = new PathDTypedArray();
    for (const pt of path) {
      result.push({ x: pt.x + dx, y: pt.y + dy });
    }
    return result;
  }
  throw new Error("todo: change message");
}

export function translatePaths(paths: Paths64, dx: bigint, dy: bigint): Paths64;
export function translatePaths(paths: PathsD, dx: number, dy: number): PathsD;
export function translatePaths(
  paths: Paths64 | PathsD,
  dx: bigint | number,
  dy: bigint | number,
): Paths64 | PathsD {
  if (isPaths64(paths) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Paths64();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result;
  } else if (
    isPathsD(paths) &&
    typeof dx === "number" &&
    typeof dy === "number"
  ) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result;
  }
  throw new Error("todo: change message");
}

export function reversePath(path: Path64Base): Path64Base;
export function reversePath(path: PathDBase): PathDBase;
export function reversePath(
  path: Path64Base | PathDBase,
): Path64Base | PathDBase {
  if (isPath64(path)) {
    const result = new Path64TypedArray();
    for (const pt of path.getClones()) {
      result.push(pt);
    }
    return result;
  } else if (isPathD(path)) {
    const result = new PathDTypedArray();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(path.getClone(i));
    }
    return result;
  }
  throw Error("todo: change message");
}

export function reversePaths(paths: Paths64): Paths64;
export function reversePaths(paths: PathsD): PathsD;
export function reversePaths(paths: Paths64 | PathsD): Paths64 | PathsD {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result;
  }
  throw Error("todo: change message");
}

export function getBounds(path: Path64Base): Rect64;
export function getBounds(paths: Paths64): Rect64;
export function getBounds(path: PathDBase): RectD;
export function getBounds(paths: PathsD): RectD;

export function getBounds(
  pathOrPaths: Path64Base | Paths64 | PathDBase | PathsD,
): Rect64 | RectD {
  if (isPaths64(pathOrPaths)) {
    const result = invalidRect64();
    for (const path of pathOrPaths) {
      for (const pt of path) {
        if (pt.x < result.left) {
          result.left = pt.x;
        }
        if (pt.x > result.right) {
          result.right = pt.x;
        }
        if (pt.y < result.top) {
          result.top = pt.y;
        }
        if (pt.y > result.bottom) {
          result.bottom = pt.y;
        }
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPath64(pathOrPaths)) {
    const result = invalidRect64();
    for (const pt of pathOrPaths) {
      if (pt.x < result.left) {
        result.left = pt.x;
      }
      if (pt.x > result.right) {
        result.right = pt.x;
      }
      if (pt.y < result.top) {
        result.top = pt.y;
      }
      if (pt.y > result.bottom) {
        result.bottom = pt.y;
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPathsD(pathOrPaths)) {
    const result = invalidRectD();
    for (const path of pathOrPaths) {
      for (const pt of path) {
        if (pt.x < result.left) {
          result.left = pt.x;
        }
        if (pt.x > result.right) {
          result.right = pt.x;
        }
        if (pt.y < result.top) {
          result.top = pt.y;
        }
        if (pt.y > result.bottom) {
          result.bottom = pt.y;
        }
      }
    }
    return result.left === Infinity ? new RectD() : result;
  } else if (isPathD(pathOrPaths)) {
    const result = invalidRectD();
    for (const pt of pathOrPaths) {
      if (pt.x < result.left) {
        result.left = pt.x;
      }
      if (pt.x > result.right) {
        result.right = pt.x;
      }
      if (pt.y < result.top) {
        result.top = pt.y;
      }
      if (pt.y > result.bottom) {
        result.bottom = pt.y;
      }
    }
    return result.left === Infinity ? new RectD() : result;
  }
  throw new Error("todo: change message");
}

export function makePath64(arr: ArrayLike<number>): Path64Base;
export function makePath64(arr: ArrayLike<bigint>): Path64Base;
export function makePath64(arr: ArrayLike<number> | ArrayLike<bigint>) {
  const path: Path64Base = new Path64TypedArray();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: BigInt(arr[i]), y: BigInt(arr[i + 1]) });
  }
  return path;
}

export function makePathD(arr: ArrayLike<number>): PathDBase {
  const path: PathDBase = new PathDTypedArray();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: arr[i], y: arr[i + 1] });
  }
  return path;
}

export function pointsNearEqual(
  pt1: PointD,
  pt2: PointD,
  distanceSqrd: number,
): boolean {
  return sqr(pt1.x - pt2.x) + sqr(pt1.y - pt2.y) < distanceSqrd;
}

export function stripNearDuplicates(
  path: PathDBase,
  minEdgeLenSqrd: number,
  isClosedPath: boolean,
): PathDBase {
  const cnt = path.length;
  const result: PathDBase = new PathDTypedArray();
  if (cnt === 0) {
    return result;
  }
  let lastPt = path.getClone(0);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (!pointsNearEqual(lastPt, path.getClone(i), minEdgeLenSqrd)) {
      lastPt = path.getClone(i);
      result.push(lastPt);
    }
  }

  if (
    isClosedPath &&
    pointsNearEqual(lastPt, result.getClone(0), minEdgeLenSqrd)
  ) {
    result.pop();
  }
  return result;
}

export function stripDuplicates(
  path: Path64Base,
  isClosedPath: boolean,
): Path64Base {
  const cnt = path.length;
  const result: Path64Base = new Path64TypedArray();
  if (cnt === 0) {
    return result;
  }
  let lastPt = path.getClone(0);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (Point64.notEquals(lastPt, path.getClone(i))) {
      lastPt = path.getClone(i);
      result.push(lastPt);
    }
  }

  if (isClosedPath && Point64.equals(lastPt, path.getClone(0))) {
    result.pop();
  }
  return result;
}

export function addPolyNodeToPaths(polyPath: PolyPath64, paths: Paths64): void {
  if (polyPath.polygon!.length > 0) {
    paths.push(polyPath.polygon!);
  }
  for (let i = 0; i < polyPath.length; i++) {
    addPolyNodeToPaths(polyPath._childs[i] as PolyPath64, paths);
  }
}

export function polyTreeToPaths64(polyTree: PolyTree64): Paths64 {
  const result = new Paths64();

  for (let i = 0; i < polyTree.length; i++) {
    addPolyNodeToPaths(polyTree._childs[i] as PolyPath64, result);
  }

  return result;
}

export function addPolyNodeToPathsD(polyPath: PolyPathD, paths: PathsD): void {
  if (polyPath.polygon!.length > 0) {
    paths.push(polyPath.polygon!);
  }
  for (let i = 0; i < polyPath.length; i++) {
    addPolyNodeToPathsD(polyPath._childs[i] as PolyPathD, paths);
  }
}

export function polyTreeToPathsD(polyTree: PolyTreeD): PathsD {
  const result = new PathsD();

  for (let i = 0; i < polyTree.length; i++) {
    addPolyNodeToPathsD(polyTree._childs[i] as PolyPathD, result);
  }

  return result;
}

export function ramerDouglasPeucker(
  path: Path64Base,
  epsilon: number,
): Path64Base;
export function ramerDouglasPeucker(path: Paths64, epsilon: number): Paths64;
export function ramerDouglasPeucker(
  path: PathDBase,
  epsilon: number,
): PathDBase;
export function ramerDouglasPeucker(path: PathsD, epsilon: number): PathsD;
export function ramerDouglasPeucker(
  pathOrPaths: Path64Base | PathDBase | Paths64 | PathsD,
  epsilon: number,
): Path64Base | PathDBase | Paths64 | PathsD {
  if (isPaths64(pathOrPaths)) {
    const result = new Paths64();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result;
  } else if (isPathsD(pathOrPaths)) {
    const result = new PathsD();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result;
  } else if (isPath64(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return pathOrPaths.clone();
    }
    const result = new Path64TypedArray();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false,
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);

    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(pathOrPaths.getClone(i));
      }
    }

    return result;
  } else if (isPathD(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return pathOrPaths.clone();
    }
    const result = new PathDTypedArray();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false,
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);

    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(pathOrPaths.getClone(i));
      }
    }

    return result;
  }
  throw new Error("todo: change message");
}

export function getNext(
  current: number,
  high: number,
  flags: boolean[],
): number {
  current++;
  const len = flags.length;
  if (high >= len) {
    throw new Error("todo: change message");
  }
  while (current <= high && flags[current]) {
    current++;
  }
  if (current <= high) {
    return current;
  }
  current = 0;
  while (flags[current] && current < len) {
    current++;
  }
  if (current >= len) {
    throw new Error("todo: change message");
  }
  return current;
}

export function getPrior(
  current: number,
  high: number,
  flags: boolean[],
): number {
  const len = flags.length;
  if (high >= len) {
    throw new Error("todo: change message");
  }

  current = current === 0 ? high : current - 1;

  while (current > 0 && flags[current]) {
    current--;
  }

  if (!flags[current]) {
    return current;
  }
  current = high;
  while (current >= 0 && flags[current]) {
    current--;
  }
  if (current < 0) {
    throw new Error("todo: change message");
  }
  return current;
}

export function simplifyPath(
  path: Path64Base,
  epsilon: number,
  isClosedPath?: boolean,
): Path64Base;
export function simplifyPath(
  path: PathDBase,
  epsilon: number,
  isClosedPath?: boolean,
): PathDBase;
export function simplifyPath(
  path: Path64Base | PathDBase,
  epsilon: number,
  isClosedPath: boolean = false,
): Path64Base | PathDBase {
  const len = path.length;
  const high = len - 1;
  const epsSqr = sqr(epsilon);

  if (isPath64(path)) {
    if (len < 4) {
      return path.clone();
    }

    const flags: boolean[] = Array.from({ length: len }, () => false);
    const dsq: number[] = Array.from({ length: len }, () => 0);
    let prev: number = high;
    let curr: number = 0;
    let start: number;
    let next: number;
    let prior2: number;
    let next2: number;

    if (isClosedPath) {
      dsq[0] = perpendicDistFromLineSqrd(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1),
      );
      dsq[high] = perpendicDistFromLineSqrd(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1),
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }

    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrd(
        path.getClone(i),
        path.getClone(i - 1),
        path.getClone(i + 1),
      );
    }

    while (true) {
      if (dsq[curr] > epsSqr) {
        start = curr;
        do {
          curr = getNext(curr, high, flags);
        } while (curr !== start && dsq[curr] > epsSqr);
        if (curr === start) {
          break;
        }
      }

      prev = getPrior(curr, high, flags);
      next = getNext(curr, high, flags);

      if (next === prev) {
        break;
      }

      if (dsq[next] < dsq[curr]) {
        flags[next] = true;

        next = getNext(next, high, flags);
        next2 = getNext(next, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrd(
            path.getClone(next),
            path.getClone(curr),
            path.getClone(next2),
          );
        }
        curr = next;
      } else {
        flags[curr] = true;
        curr = next;

        next = getNext(next, high, flags);
        prior2 = getNext(prev, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrd(
            path.getClone(prev),
            path.getClone(prior2),
            path.getClone(curr),
          );
        }
      }
    }

    const result = new Path64TypedArray();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(path.getClone(i));
      }
    }
    return result;
  } else if (isPathD(path)) {
    if (len < 4) {
      return path.clone();
    }

    const flags: boolean[] = Array.from({ length: len }, () => false);
    const dsq: number[] = Array.from({ length: len }, () => 0);
    let prev: number = high;
    let curr: number = 0;
    let start: number;
    let next: number;
    let prior2: number;
    let next2: number;

    if (isClosedPath) {
      dsq[0] = perpendicDistFromLineSqrd(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1),
      );
      dsq[high] = perpendicDistFromLineSqrd(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1),
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }

    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrd(
        path.getClone(i),
        path.getClone(i - 1),
        path.getClone(i + 1),
      );
    }

    while (true) {
      if (dsq[curr] > epsSqr) {
        start = curr;
        do {
          curr = getNext(curr, high, flags);
        } while (curr !== start && dsq[curr] > epsSqr);
        if (curr === start) {
          break;
        }
      }

      prev = getPrior(curr, high, flags);
      next = getNext(curr, high, flags);

      if (next === prev) {
        break;
      }

      if (dsq[next] < dsq[curr]) {
        flags[next] = true;

        next = getNext(next, high, flags);
        next2 = getNext(next, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrd(
            path.getClone(next),
            path.getClone(curr),
            path.getClone(next2),
          );
        }
        curr = next;
      } else {
        flags[curr] = true;
        curr = next;

        next = getNext(next, high, flags);
        prior2 = getNext(prev, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrd(
            path.getClone(prev),
            path.getClone(prior2),
            path.getClone(curr),
          );
        }
      }
    }
    const result = new PathDTypedArray();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(path.getClone(i));
      }
    }
    return result;
  } else {
    throw new Error("todo: change message");
  }
}

export function simplifyPaths(
  paths: Paths64,
  epsilon: number,
  isClosedPaths?: boolean,
): Paths64;
export function simplifyPaths(
  paths: PathsD,
  epsilon: number,
  isClosedPaths?: boolean,
): PathsD;
export function simplifyPaths<TPaths extends Paths64 | PathsD>(
  paths: TPaths,
  epsilon: number,
  isClosedPath = false,
): TPaths {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPath));
    }
    return result as TPaths;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPath));
    }
    return result as TPaths;
  }
  throw new Error("todo: change message");
}

export function trimCollinear(path: Path64Base, isOpen?: boolean): Path64Base;
export function trimCollinear(
  path: PathDBase,
  precision: number,
  isOpen?: boolean,
): PathDBase;
export function trimCollinear(
  path: Path64Base | PathDBase,
  isOpenOrPrecision?: boolean | number,
  mayBeIsOpen: boolean = false,
): Path64Base | PathDBase {
  let precision: number;
  let isOpen: boolean;
  if (
    isPathD(path) &&
    isOpenOrPrecision !== undefined &&
    typeof isOpenOrPrecision === "number"
  ) {
    precision = isOpenOrPrecision;
    isOpen = mayBeIsOpen;
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    let p = scalePath64(path as PathDBase, scale);
    p = trimCollinear(p, isOpen);
    return scalePathD(p, 1 / scale);
  } else if (
    isPath64(path) &&
    (isOpenOrPrecision === undefined || typeof isOpenOrPrecision === "boolean")
  ) {
    isOpen = isOpenOrPrecision ?? false;
    let len = path.length;
    let i: number = 0;
    if (!isOpen) {
      while (
        i < len - 1 &&
        crossProduct64(
          path.getClone(len - 1),
          path.getClone(i),
          path.getClone(i + 1),
        ) === 0
      ) {
        i++;
      }
      while (
        i < len - 1 &&
        crossProduct64(
          path.getClone(len - 2),
          path.getClone(len - 1),
          path.getClone(i),
        ) === 0
      ) {
        len--;
      }
    }

    if (len - 1 < 3) {
      if (
        !isOpen ||
        len < 2 ||
        Point64.equals(path.getClone(0), path.getClone(1))
      ) {
        return new Path64TypedArray();
      }

      return path.clone();
    }
    const result: Path64Base = new Path64TypedArray();

    let last = path.getClone(i);

    for (i++; i < len - 1; i++) {
      if (crossProduct64(last, path.getClone(i), path.getClone(i + 1)) === 0) {
        continue;
      }
      last = path.getClone(i);
      result.push(last);
    }

    if (isOpen) {
      result.push(path.getClone(len - 1));
    } else if (
      crossProduct64(last, path.getClone(len - 1), result.getClone(0)) !== 0
    ) {
      result.push(path.getClone(len - 1));
    } else {
      while (
        result.length > 2 &&
        crossProduct64(
          result.getClone(result.length - 1),
          result.getClone(result.length - 2),
          result.getClone(0),
        ) === 0
      ) {
        result.pop();
      }
      if (result.length < 3) {
        result.clear();
      }
    }

    return result;
  }
  throw new Error("todo: change message");
}

export function pointInPolygon(
  pt: Point64,
  polygon: Path64Base,
): PointInPolygonResult;
export function pointInPolygon(
  pt: PointD,
  polygon: PathDBase,
  precision?: number,
): PointInPolygonResult;
export function pointInPolygon(
  pt: Point64 | PointD,
  polygon: Path64Base | PathDBase,
  precision: number = 2,
) {
  if (isPoint64(pt)) {
    return internalPointInPolygon(pt, polygon as Path64Base);
  } else {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const p = Point64.createScaledPoint(pt.x, pt.y, scale);
    const path = scalePath64(polygon as PathDBase, scale);
    return internalPointInPolygon(p, path);
  }
}

export function ellipse(
  center: Point64,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): Path64Base;
export function ellipse(
  center: PointD,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): PathDBase;
export function ellipse(
  center: Point64 | PointD,
  radiusX: number,
  radiusY: number = 0,
  steps: number = 0,
): Path64Base | PathDBase {
  if (isPoint64(center)) {
    if (radiusX <= 0) {
      return new Path64TypedArray();
    }
  } else if (isPointD(center)) {
    if (radiusX <= 0) {
      return new PathDTypedArray();
    }
  } else {
    throw new Error("todo: change message");
  }

  if (radiusY <= 0) {
    radiusY = radiusX;
  }
  if (steps <= 2) {
    steps = Math.ceil(Math.PI * Math.sqrt((radiusX + radiusY) / 2));
  }
  const si = Math.sin((2 * Math.PI) / steps);
  const co = Math.cos((2 * Math.PI) / steps);

  let dx = co;
  let dy = si;

  if (isPoint64(center)) {
    const centerX = Number(center.x);
    const centerY = Number(center.y);
    const result: Path64Base = new Path64TypedArray();
    result.push({ x: numberToBigInt(centerX + radiusX), y: center.y });
    for (let i = 1; i < steps; i++) {
      result.push({
        x: numberToBigInt(centerX + radiusX * dx),
        y: numberToBigInt(centerY + radiusY * dy),
      });
      const x = dx * co - dy * si;
      dy = dy * co + dx * si;
      dx = x;
    }
    return result;
  } else {
    const centerX = center.x;
    const centerY = center.y;
    const result: PathDBase = new PathDTypedArray();
    result.push({ x: centerX + radiusX, y: center.y });
    for (let i = 1; i < steps; i++) {
      result.push({ x: centerX + radiusX * dx, y: centerY + radiusY * dy });
      const x = dx * co - dy * si;
      dy = dy * co + dx * si;
      dx = x;
    }
    return result;
  }
}

export function showPolyPathStructure(pp: PolyPathBase, level: number): void {
  const spaces = " ".repeat(level * 2);
  const caption = pp.getIsHole() ? "Hole " : "Outer ";
  if (pp.length === 0) {
    console.log(spaces + caption);
  } else {
    console.log(spaces + caption + `(${pp.length})`);
    for (const child of pp) {
      showPolyPathStructure(child, level + 1);
    }
  }
}

export function showPolyTreeStructure(polytree: PolyTree64 | PolyTreeD): void {
  console.log("Polytree Root");
  for (const child of polytree) {
    showPolyPathStructure(child, 1);
  }
}

export const Clipper = {
  invalidRect64,
  invalidRectD,
  intersect,
  union,
  difference,
  xor,
  booleanOp,
  inflatePaths,
  rectClip,
  rectClipLines,
  minkowskiSum,
  minkowskiDiff,
  area,
  isPositive,
  path64ToString,
  paths64ToString,
  pathDToString,
  pathsDToString,
  offsetPath,
  scalePoint64,
  scalePointD,
  scaleRect,
  scalePath,
  scalePaths,
  scalePath64,
  scalePaths64,
  scalePathD,
  scalePathsD,
  path64,
  paths64,
  pathsD,
  pathD,
  translatePath,
  translatePaths,
  reversePath,
  reversePaths,
  getBounds,
  makePath64,
  makePathD,
  sqr,
  pointsNearEqual,
  stripNearDuplicates,
  stripDuplicates,
  addPolyNodeToPaths,
  polyTreeToPaths64,
  addPolyNodeToPathsD,
  polyTreeToPathsD,
  perpendicDistFromLineSqrd,
  ramerDouglasPeucker,
  simplifyPath,
  simplifyPaths,
  trimCollinear,
  pointInPolygon,
  ellipse,
  showPolyTreeStructure,
} as const;
