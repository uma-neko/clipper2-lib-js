import { ClipType, FillRule, PathType } from "./Core/CoreEnums";
import {
  checkPrecision,
  isAlmostZero,
  pointInPolygon as internalPointInPolygon,
  crossProduct64,
} from "./Core/InternalClipper";
import { isPath64 } from "./Core/Path64";
import type { IPath64 } from "./Core/IPath64";
import { Path64TypedArray } from "./Core/Path64TypedArray";
import { isPathD } from "./Core/PathD";
import { IPathD } from "./Core/IPathD";
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
): number {
  if (isPoint64(pt) && isPoint64(line1) && isPoint64(line2)) {
    return perpendicDistFromLineSqrd64(pt, line1, line2);
  } else if (isPointD(pt) && isPointD(line1) && isPointD(line2)) {
    return perpendicDistFromLineSqrdD(pt, line1, line2);
  } else {
    throw new TypeError(
      "Invalid argument types. Argument pt and line1 and line2 are must be of same point type.",
    );
  }
}

export function perpendicDistFromLineSqrd64(
  pt: Point64,
  line1: Point64,
  line2: Point64,
): number {
  const x2 = line2.x - line1.x;
  const y2 = line2.y - line1.y;
  if (x2 === 0n && y2 === 0n) {
    return 0;
  }
  const x1 = pt.x - line1.x;
  const y1 = pt.y - line1.y;
  return sqr(Number(x1 * y2 - x2 * y1)) / Number(x2 * x2 + y2 * y2);
}

export function perpendicDistFromLineSqrdD(
  pt: PointD,
  line1: PointD,
  line2: PointD,
): number {
  const x2 = line2.x - line1.x;
  const y2 = line2.y - line1.y;
  if (x2 === 0 && y2 === 0) {
    return 0;
  }
  const x1 = pt.x - line1.x;
  const y1 = pt.y - line1.y;
  return sqr(x1 * y2 - x2 * y1) / (x2 * x2 + y2 * y2);
}

export function sqr(value: number): number {
  return value * value;
}

export function rdp(
  path: IPath64 | IPathD,
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
      const d = perpendicDistFromLineSqrd64(path.getClone(i), beginPt, endPt);
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
      rdp(path, idx, end, epsSqrd, flags);
    }
  } else if (isPathD(path)) {
    const beginPt = path.getClone(begin);
    while (end > begin && PointD.equals(beginPt, path.getClone(end))) {
      flags[end--] = false;
    }
    const endPt = path.getClone(end);
    for (let i = begin + 1; i < end; i++) {
      const d = perpendicDistFromLineSqrdD(path.getClone(i), beginPt, endPt);
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
      rdp(path, idx, end, epsSqrd, flags);
    }
  } else {
    throw new TypeError("Invalid argument types.");
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
  throw new TypeError("Invalid argument types.");
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
  } else if (isPathsD(paths)) {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const tmp = scalePaths64(paths, scale);
    const co = new ClipperOffset(miterLimit);
    co.addPaths(tmp, joinType, endType);
    co.execute(delta * scale, tmp);
    return scalePathsD(tmp, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}

export function rectClip(rect: Rect64, pathOrpaths: IPath64 | Paths64): Paths64;
export function rectClip(
  rect: RectD,
  pathOrPaths: IPathD | PathsD,
  precision?: number,
): PathsD;
export function rectClip(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | IPath64 | PathsD | IPathD,
  precision: number = 2,
): Paths64 | PathsD {
  if (isRect64(rect) && (isPaths64(pathOrPaths) || isPath64(pathOrPaths))) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }

    let paths: Paths64;

    if (isPaths64(pathOrPaths)) {
      paths = Paths64.clone(pathOrPaths);
    } else {
      paths = Paths64.clone([pathOrPaths]);
    }

    const rc = new RectClip64(rect);
    return rc.execute(paths);
  } else if (isRectD(rect) && (isPathsD(pathOrPaths) || isPathD(pathOrPaths))) {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }

    const scale = Math.pow(10, precision);

    let tmpPath: Paths64;

    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    }

    const r = scaleRect(rect, scale);
    const rc = new RectClip64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}

export function rectClipLines(rect: Rect64, paths: Paths64): Paths64;
export function rectClipLines(rect: Rect64, path: IPath64): Paths64;
export function rectClipLines(
  rect: RectD,
  paths: PathsD,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: RectD,
  path: IPathD,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | IPath64 | PathsD | IPathD,
  precision: number = 2,
): Paths64 | PathsD {
  if (isRect64(rect) && (isPaths64(pathOrPaths) || isPath64(pathOrPaths))) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }

    let paths: Paths64;

    if (isPaths64(pathOrPaths)) {
      paths = pathOrPaths;
    } else {
      paths = new Paths64();
      paths.push(pathOrPaths);
    }

    const rc = new RectClipLines64(rect);
    return rc.execute(paths);
  } else if (isRectD(rect) && (isPathsD(pathOrPaths) || isPathD(pathOrPaths))) {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }

    const scale = Math.pow(10, precision);

    let tmpPath: Paths64;

    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    }

    const r = scaleRect(rect, scale);
    const rc = new RectClipLines64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}

export function minkowskiSum(
  pattern: IPath64 | IPathD,
  path: IPath64 | IPathD,
  isClosed: boolean,
): Paths64 | PathsD {
  return sum(pattern, path, isClosed);
}

export function minkowskiDiff(
  pattern: IPath64 | IPathD,
  path: IPath64 | IPathD,
  isClosed: boolean,
): Paths64 | PathsD {
  return diff(pattern, path, isClosed);
}

export function area(pathOrPaths: IPath64 | IPathD | Paths64 | PathsD): number {
  let resultArea = 0;
  if (isPaths64(pathOrPaths) || isPathsD(pathOrPaths)) {
    for (const path of pathOrPaths) {
      resultArea += area(path);
    }
  } else if (isPath64(pathOrPaths)) {
    if (pathOrPaths.length < 3) {
      return 0;
    }

    let prevX = pathOrPaths.getX(pathOrPaths.length - 1);
    let prevY = pathOrPaths.getY(pathOrPaths.length - 1);
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      const currX = pathOrPaths.getX(i);
      const currY = pathOrPaths.getY(i);
      resultArea += Number((prevY + currY) * (prevX - currX));
      prevX = currX;
      prevY = currY;
    }
    resultArea *= 0.5;
  } else if (isPathD(pathOrPaths)) {
    if (pathOrPaths.length < 3) {
      return 0;
    }

    let prevX = pathOrPaths.getX(pathOrPaths.length - 1);
    let prevY = pathOrPaths.getY(pathOrPaths.length - 1);
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      const currX = pathOrPaths.getX(i);
      const currY = pathOrPaths.getY(i);
      resultArea += (prevY + currY) * (prevX - currX);
      prevX = currX;
      prevY = currY;
    }
    resultArea *= 0.5;
  } else {
    throw new TypeError("Invalid argument types.");
  }

  return resultArea;
}

export function isPositive(path: IPath64 | IPathD): boolean {
  return area(path) >= 0;
}

export function path64ToString(path: IPath64): string {
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

export function pathDToString(path: IPathD): string {
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

export function offsetPath(path: IPath64, dx: bigint, dy: bigint): IPath64 {
  const result = new Path64TypedArray();
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
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
    numberToBigInt(rec.left * scale),
    numberToBigInt(rec.top * scale),
    numberToBigInt(rec.right * scale),
    numberToBigInt(rec.bottom * scale),
  );
}

export function scalePath(path: IPath64, scale: number): IPath64;
export function scalePath(path: IPathD, scale: number): IPathD;
export function scalePath(
  path: IPath64 | IPathD,
  scale: number,
): IPath64 | IPathD {
  if (isPath64(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result = new Path64TypedArray(path.length);

    for (let i = 0, len = path.length; i < len; i++) {
      result.push({
        x: numberToBigInt(Number(path.getX(i)) * scale),
        y: numberToBigInt(Number(path.getY(i)) * scale),
      });
    }
    return result;
  } else if (isPathD(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result = new PathDTypedArray(path.length);

    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) * scale, y: path.getY(i) * scale });
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
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
      const tmpPath = new Path64TypedArray(path.length);
      for (let i = 0, len = path.length; i < len; i++) {
        tmpPath.push({
          x: numberToBigInt(Number(path.getX(i)) * scale),
          y: numberToBigInt(Number(path.getY(i)) * scale),
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
      const tmpPath = new PathDTypedArray(path.length);
      for (let i = 0, len = path.length; i < len; i++) {
        tmpPath.push({ x: path.getX(i) * scale, y: path.getY(i) * scale });
      }
      result.push(tmpPath);
    }

    return result;
  }
  throw new TypeError("Invalid argument types.");
}

export function scalePath64(path: IPathD, scale: number): IPath64 {
  const result = new Path64TypedArray(path.length);
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({
      x: numberToBigInt(path.getX(i) * scale),
      y: numberToBigInt(path.getY(i) * scale),
    });
  }
  return result;
}

export function scalePathD(path: IPath64, scale: number): IPathD {
  const result = new PathDTypedArray(path.length);
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({
      x: Number(path.getX(i)) * scale,
      y: Number(path.getY(i)) * scale,
    });
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

export function path64(path: IPathD): IPath64 {
  return scalePath64(path, 1);
}

export function paths64(paths: PathsD): Paths64 {
  return scalePaths64(paths, 1);
}

export function pathD(path: IPath64): IPathD {
  return scalePathD(path, 1);
}

export function pathsD(paths: Paths64): PathsD {
  return scalePathsD(paths, 1);
}

export function translatePath(path: IPath64, dx: bigint, dy: bigint): IPath64;
export function translatePath(path: IPathD, dx: number, dy: number): IPathD;
export function translatePath(
  path: IPath64 | IPathD,
  dx: bigint | number,
  dy: bigint | number,
): IPath64 | IPathD {
  if (isPath64(path) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Path64TypedArray();
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
    }
    return result;
  } else if (
    isPathD(path) &&
    typeof dx === "number" &&
    typeof dy === "number"
  ) {
    const result = new PathDTypedArray();
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
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
  throw new TypeError("Invalid argument types.");
}

export function reversePath(path: IPath64): IPath64;
export function reversePath(path: IPathD): IPathD;
export function reversePath(path: IPath64 | IPathD): IPath64 | IPathD {
  if (isPath64(path)) {
    const result = new Path64TypedArray();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(path.getClone(i));
    }
    return result;
  } else if (isPathD(path)) {
    const result = new PathDTypedArray();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(path.getClone(i));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
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
  throw new TypeError("Invalid argument types.");
}

export function getBounds(path: IPath64): Rect64;
export function getBounds(paths: Paths64): Rect64;
export function getBounds(path: IPathD): RectD;
export function getBounds(paths: PathsD): RectD;

export function getBounds(
  pathOrPaths: IPath64 | Paths64 | IPathD | PathsD,
): Rect64 | RectD {
  if (isPaths64(pathOrPaths)) {
    const result = invalidRect64();
    for (const path of pathOrPaths) {
      for (let i = 0, len = path.length; i < len; i++) {
        if (path.getX(i) < result.left) {
          result.left = path.getX(i);
        }
        if (path.getX(i) > result.right) {
          result.right = path.getX(i);
        }
        if (path.getY(i) < result.top) {
          result.top = path.getY(i);
        }
        if (path.getY(i) > result.bottom) {
          result.bottom = path.getY(i);
        }
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPath64(pathOrPaths)) {
    const result = invalidRect64();
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      if (pathOrPaths.getX(i) < result.left) {
        result.left = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getX(i) > result.right) {
        result.right = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getY(i) < result.top) {
        result.top = pathOrPaths.getY(i);
      }
      if (pathOrPaths.getY(i) > result.bottom) {
        result.bottom = pathOrPaths.getY(i);
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPathsD(pathOrPaths)) {
    const result = invalidRectD();
    for (const path of pathOrPaths) {
      for (let i = 0, len = path.length; i < len; i++) {
        if (path.getX(i) < result.left) {
          result.left = path.getX(i);
        }
        if (path.getX(i) > result.right) {
          result.right = path.getX(i);
        }
        if (path.getY(i) < result.top) {
          result.top = path.getY(i);
        }
        if (path.getY(i) > result.bottom) {
          result.bottom = path.getY(i);
        }
      }
    }
    return result.left === Infinity ? new RectD() : result;
  } else if (isPathD(pathOrPaths)) {
    const result = invalidRectD();
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      if (pathOrPaths.getX(i) < result.left) {
        result.left = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getX(i) > result.right) {
        result.right = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getY(i) < result.top) {
        result.top = pathOrPaths.getY(i);
      }
      if (pathOrPaths.getY(i) > result.bottom) {
        result.bottom = pathOrPaths.getY(i);
      }
    }
    return result.left === Infinity ? new RectD() : result;
  }
  throw new TypeError("Invalid argument types.");
}

export function makePath64(arr: ArrayLike<number>): IPath64;
export function makePath64(arr: ArrayLike<bigint>): IPath64;
export function makePath64(arr: ArrayLike<number> | ArrayLike<bigint>) {
  const path = new Path64TypedArray();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: BigInt(arr[i]), y: BigInt(arr[i + 1]) });
  }
  return path;
}

export function makePathD(arr: ArrayLike<number>): IPathD {
  const path = new PathDTypedArray();
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
  path: IPathD,
  minEdgeLenSqrd: number,
  isClosedPath: boolean,
): IPathD {
  const cnt = path.length;
  const result = new PathDTypedArray();
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

export function stripDuplicates(path: IPath64, isClosedPath: boolean): IPath64 {
  const cnt = path.length;
  const result = new Path64TypedArray();
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

export function ramerDouglasPeucker(path: IPath64, epsilon: number): IPath64;
export function ramerDouglasPeucker(path: Paths64, epsilon: number): Paths64;
export function ramerDouglasPeucker(path: IPathD, epsilon: number): IPathD;
export function ramerDouglasPeucker(path: PathsD, epsilon: number): PathsD;
export function ramerDouglasPeucker(
  pathOrPaths: IPath64 | IPathD | Paths64 | PathsD,
  epsilon: number,
): IPath64 | IPathD | Paths64 | PathsD {
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
  throw new TypeError("Invalid argument types.");
}

export function getNext(
  current: number,
  high: number,
  flags: boolean[],
): number {
  current++;
  const len = flags.length;
  if (high >= len) {
    throw new RangeError("Invalid array length.");
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
    throw new RangeError("Invalid array length.");
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
    throw new RangeError("Invalid array length.");
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
    throw new RangeError("Invalid array length.");
  }
  return current;
}

export function simplifyPath(
  path: IPath64,
  epsilon: number,
  isClosedPath?: boolean,
): IPath64;
export function simplifyPath(
  path: IPathD,
  epsilon: number,
  isClosedPath?: boolean,
): IPathD;
export function simplifyPath(
  path: IPath64 | IPathD,
  epsilon: number,
  isClosedPath: boolean = false,
): IPath64 | IPathD {
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
      dsq[0] = perpendicDistFromLineSqrd64(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1),
      );
      dsq[high] = perpendicDistFromLineSqrd64(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1),
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }

    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrd64(
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
        dsq[curr] = perpendicDistFromLineSqrd64(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrd64(
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
        dsq[curr] = perpendicDistFromLineSqrd64(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrd64(
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
      dsq[0] = perpendicDistFromLineSqrdD(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1),
      );
      dsq[high] = perpendicDistFromLineSqrdD(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1),
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }

    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrdD(
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
        dsq[curr] = perpendicDistFromLineSqrdD(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrdD(
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
        dsq[curr] = perpendicDistFromLineSqrdD(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next),
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrdD(
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
    throw new TypeError("Invalid argument types.");
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
export function simplifyPaths(
  paths: Paths64 | PathsD,
  epsilon: number,
  isClosedPath = false,
): Paths64 | PathsD {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPath));
    }
    return result;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPath));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}

export function trimCollinear(path: IPath64, isOpen?: boolean): IPath64;
export function trimCollinear(
  path: IPathD,
  precision: number,
  isOpen?: boolean,
): IPathD;
export function trimCollinear(
  path: IPath64 | IPathD,
  isOpenOrPrecision?: boolean | number,
  mayBeIsOpen: boolean = false,
): IPath64 | IPathD {
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
    let p = scalePath64(path, scale);
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
        ) === 0n
      ) {
        i++;
      }
      while (
        i < len - 1 &&
        crossProduct64(
          path.getClone(len - 2),
          path.getClone(len - 1),
          path.getClone(i),
        ) === 0n
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
    const result = new Path64TypedArray();

    let last = path.getClone(i);

    for (i++; i < len - 1; i++) {
      if (crossProduct64(last, path.getClone(i), path.getClone(i + 1)) === 0n) {
        continue;
      }
      last = path.getClone(i);
      result.push(last);
    }

    if (isOpen) {
      result.push(path.getClone(len - 1));
    } else if (
      crossProduct64(last, path.getClone(len - 1), result.getClone(0)) !== 0n
    ) {
      result.push(path.getClone(len - 1));
    } else {
      const startPt = result.getClone(0);
      while (
        result.length > 2 &&
        crossProduct64(
          result.getClone(result.length - 1),
          result.getClone(result.length - 2),
          startPt,
        ) === 0n
      ) {
        result.pop();
      }
      if (result.length < 3) {
        result.clear();
      }
    }

    return result;
  }
  throw new TypeError("Invalid argument types.");
}

export function pointInPolygon(
  pt: Point64,
  polygon: IPath64,
): PointInPolygonResult;
export function pointInPolygon(
  pt: PointD,
  polygon: IPathD,
  precision?: number,
): PointInPolygonResult;
export function pointInPolygon(
  pt: Point64 | PointD,
  polygon: IPath64 | IPathD,
  precision: number = 2,
): PointInPolygonResult {
  if (isPoint64(pt) && isPath64(polygon)) {
    return internalPointInPolygon(pt, polygon);
  } else if(isPointD(pt) && isPathD(polygon)) {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const p = Point64.createScaledPoint(pt.x, pt.y, scale);
    const path = scalePath64(polygon, scale);
    return internalPointInPolygon(p, path);
  }
  throw new TypeError("Invalid argument types.");
}

export function ellipse(
  center: Point64,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): IPath64;
export function ellipse(
  center: PointD,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): IPathD;
export function ellipse(
  center: Point64 | PointD,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): IPath64 | IPathD {
  if (isPoint64(center)) {
    return ellipse64(center, radiusX, radiusY, steps);
  } else if (isPointD(center)) {
    return ellipseD(center, radiusX, radiusY, steps);
  }
  throw new TypeError("Invalid argument types.");
}

function ellipse64(
  center: Point64,
  radiusX: number,
  radiusY: number = 0,
  steps: number = 0,
): IPath64 {
  if (radiusX <= 0) {
    return new Path64TypedArray();
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

  const centerX = center.x;
  const centerY = center.y;
  const result = new Path64TypedArray(steps);
  result.push({ x: centerX + numberToBigInt(radiusX), y: centerY });
  for (let i = 1; i < steps; i++) {
    result.push({
      x: centerX + numberToBigInt(radiusX * dx),
      y: centerY + numberToBigInt(radiusY * dy),
    });
    const x = dx * co - dy * si;
    dy = dy * co + dx * si;
    dx = x;
  }
  return result;
}

function ellipseD(
  center: PointD,
  radiusX: number,
  radiusY: number = 0,
  steps: number = 0,
): IPathD {
  if (radiusX <= 0) {
    return new PathDTypedArray();
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

  const centerX = center.x;
  const centerY = center.y;
  const result = new PathDTypedArray(steps);
  result.push({ x: centerX + radiusX, y: center.y });
  for (let i = 1; i < steps; i++) {
    result.push({ x: centerX + radiusX * dx, y: centerY + radiusY * dy });
    const x = dx * co - dy * si;
    dy = dy * co + dx * si;
    dx = x;
  }
  return result;
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
