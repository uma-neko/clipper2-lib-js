import { ClipType, FillRule, PathType } from "./Core/CoreEnums";
import {
  checkPrecision,
  crossProduct,
  isAlmostZero,
  pointInPolygon as InternalpointInPolygon,
} from "./Core/InternalClipper";
import { Path64, isPath64 } from "./Core/Path64";
import { PathD, isPathD } from "./Core/PathD";
import { Paths64, isPaths64 } from "./Core/Paths64";
import { PathsD, isPathsD } from "./Core/PathsD";
import { Point64, isPoint64 } from "./Core/Point64";
import { PointD, isPointD } from "./Core/PointD";
import { Rect64, isRect64 } from "./Core/Rect64";
import { RectD } from "./Core/RectD";
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

const clonePoint = <TPoint extends Point64 | PointD>(pt: TPoint): TPoint => {
  return { x: pt.x, y: pt.y } as TPoint;
};

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
  Math.trunc(num) + (Math.trunc(num * 2) % 2);

export function numberToBigInt(num: number): bigint {
  return BigInt(awayFromZeroRounding(num));
}

export function perpendicDistFromLineSqrd<TPoint extends Point64 | PointD>(
  pt: TPoint,
  line1: TPoint,
  line2: TPoint,
): number {
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  if (isPoint64(pt) && isPoint64(line1) && isPoint64(line2)) {
    x1 = Number(pt.x - line1.x);
    y1 = Number(pt.y - line1.y);
    x2 = Number(line2.x - line1.x);
    y2 = Number(line2.y - line1.y);
  } else if (isPointD(pt) && isPointD(line1) && isPointD(line2)) {
    x1 = pt.x - line1.x;
    y1 = pt.y - line1.y;
    x2 = line2.x - line1.x;
    y2 = line2.y - line1.y;
  } else {
    throw new Error("todo: change message");
  }
  if (x2 === 0 && y2 === 0) {
    return 0;
  }
  return sqr(x1 * y2 - x2 * y1) / (x2 * x2 + y2 * y2);
}

export function sqr(value: number): number {
  return value * value;
}

export function rdp(
  path: Path64 | PathD,
  begin: number,
  end: number,
  epsSqrd: number,
  flags: boolean[],
): void {
  let idx = 0;
  let max_d = 0;
  while (
    end > begin &&
    path[begin].x === path[end].x &&
    path[begin].y === path[end].y
  ) {
    flags[end--] = false;
  }
  for (let i = begin + 1; i < end; i++) {
    const d = perpendicDistFromLineSqrd(path[i], path[begin], path[end]);
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
export function intersect<TPaths extends Paths64 | PathsD>(
  subject: TPaths,
  clip: TPaths,
  fillRule: FillRule,
  precision: number = 2,
): TPaths {
  return booleanOp(
    ClipType.Intersection,
    subject,
    clip,
    fillRule,
    precision,
  ) as TPaths;
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
export function union<TPaths extends Paths64 | PathsD>(
  subject: TPaths,
  fillRuleOrClip: TPaths | FillRule,
  fillRule?: FillRule,
  precision: number = 2,
): TPaths {
  if (typeof fillRuleOrClip === "number") {
    return booleanOp(
      ClipType.Union,
      subject,
      undefined,
      fillRuleOrClip as FillRule,
      precision,
    ) as TPaths;
  } else {
    return booleanOp(
      ClipType.Union,
      subject,
      fillRuleOrClip,
      fillRule!,
      precision,
    ) as TPaths;
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
export function difference<TPaths extends Paths64 | PathsD>(
  subject: TPaths,
  clip: TPaths,
  fillRule: FillRule,
  precision: number = 2,
): TPaths {
  return booleanOp(
    ClipType.Difference,
    subject,
    clip,
    fillRule,
    precision,
  ) as TPaths;
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
export function xor<TPaths extends Paths64 | PathsD>(
  subject: TPaths,
  clip: TPaths,
  fillRule: FillRule,
  precision: number = 2,
): TPaths {
  return booleanOp(ClipType.Xor, subject, clip, fillRule, precision) as TPaths;
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
export function booleanOp<TPaths extends Paths64 | PathsD>(
  clipType: ClipType,
  subject: TPaths,
  clip: TPaths | undefined,
  fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD,
  precisionOrFillRule?: number | FillRule,
  precision?: number,
): TPaths | void;
export function booleanOp<TPaths extends Paths64 | PathsD>(
  clipType: ClipType,
  subject: TPaths,
  clip: TPaths | undefined,
  fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD,
  precisionOrFillRule?: number | FillRule,
  precision?: number,
): TPaths | void {
  if (isPaths64(subject) && (clip === undefined || isPaths64(clip))) {
    if (typeof fillRuleOrPolyTree === "number") {
      const solution = new Paths64();
      const c = new Clipper64();
      c.addPaths(subject, PathType.Subject);
      if (clip !== undefined) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, fillRuleOrPolyTree, solution);
      return solution as TPaths;
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
      return solution as TPaths;
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
export function inflatePaths<TPaths extends Paths64 | PathsD>(
  paths: TPaths,
  delta: number,
  joinType: JoinType,
  endType: EndType,
  miterLimit: number = 2.0,
  precision: number = 2,
): TPaths {
  if (isPaths64(paths)) {
    const co = new ClipperOffset(miterLimit);
    co.addPaths(paths, joinType, endType);
    const solution = new Paths64();
    co.execute(delta, solution);
    return solution as TPaths;
  } else {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const tmp = scalePaths64(paths, scale);
    const co = new ClipperOffset(miterLimit);
    co.addPaths(tmp, joinType, endType);
    co.execute(delta * scale, tmp);
    return scalePathsD(tmp, 1 / scale) as TPaths;
  }
}

export function rectClip(rect: Rect64, pathOrpaths: Path64 | Paths64): Paths64;
export function rectClip(
  rect: RectD,
  pathOrPaths: PathD | PathsD,
  precision?: number,
): PathsD;
export function rectClip(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | Path64 | PathsD | PathD,
  precision: number = 2,
): Paths64 & PathsD {
  if (isRect64(rect)) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64() as Paths64 & PathsD;
    }

    const paths: Paths64 = new Paths64() as Paths64 & PathsD;

    if (isPaths64(pathOrPaths)) {
      for (const path of pathOrPaths) {
        const clonedPath: Path64 = new Path64();
        for (const pt of path) {
          clonedPath.push(clonePoint(pt));
        }
        paths.push(clonedPath);
      }
    } else {
      const clonedPath: Path64 = new Path64();
      for (const pt of pathOrPaths as Path64) {
        clonedPath.push(clonePoint(pt));
      }
      paths.push(clonedPath);
    }

    const rc = new RectClip64(rect);
    return rc.execute(paths) as Paths64 & PathsD;
  } else {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD() as Paths64 & PathsD;
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
    return scalePathsD(tmpPath, 1 / scale) as Paths64 & PathsD;
  }
}

export function rectClipLines(rect: Rect64, paths: Paths64): Paths64;
export function rectClipLines(rect: Rect64, path: Path64): Paths64;
export function rectClipLines(
  rect: RectD,
  paths: PathsD,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: RectD,
  path: PathD,
  precision?: number,
): PathsD;
export function rectClipLines(
  rect: Rect64 | RectD,
  pathOrPaths: Paths64 | Path64 | PathsD | PathD,
  precision: number = 2,
): Paths64 & PathsD {
  if (isRect64(rect)) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64() as Paths64 & PathsD;
    }

    let paths: Paths64;

    if (isPaths64(pathOrPaths)) {
      paths = pathOrPaths;
    } else {
      paths = new Paths64();
      paths.push(pathOrPaths as Path64);
    }

    const rc = new RectClipLines64(rect);
    return rc.execute(paths) as Paths64 & PathsD;
  } else {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD() as Paths64 & PathsD;
    }

    const scale = Math.pow(10, precision);

    let tmpPath: Paths64;

    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths as PathD, scale));
    }

    const r = scaleRect(rect, scale);
    const rc = new RectClipLines64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale) as Paths64 & PathsD;
  }
}

export function minkowskiSum(
  pattern: Path64 | PathD,
  path: Path64 | PathD,
  isClosed: boolean,
): Paths64 | PathsD {
  return sum(pattern, path, isClosed);
}

export function minkowskiDiff(
  pattern: Path64 | PathD,
  path: Path64 | PathD,
  isClosed: boolean,
): Paths64 | PathsD {
  return diff(pattern, path, isClosed);
}

export function area(pathOrPaths: Path64 | PathD | Paths64 | PathsD): number {
  let resultArea = 0;
  if (isPaths64(pathOrPaths) || isPathsD(pathOrPaths)) {
    for (const path of pathOrPaths) {
      resultArea += area(path);
    }
  } else {
    if (pathOrPaths.length < 3) {
      return 0;
    }

    let prevPt = pathOrPaths[pathOrPaths.length - 1];

    for (const pt of pathOrPaths) {
      if (isPoint64(pt)) {
        resultArea += Number(
          ((prevPt.y as bigint) + pt.y) * ((prevPt.x as bigint) - pt.x),
        );
      } else {
        resultArea +=
          ((prevPt.y as number) + pt.y) * ((prevPt.x as number) - pt.x);
      }
      prevPt = pt;
    }

    resultArea *= 0.5;
  }

  return resultArea;
}

export function isPositive(poly: Path64 | PathD): boolean {
  return area(poly) >= 0;
}

export function path64ToString(path: Path64): string {
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

export function pathDToString(path: PathD): string {
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

export function offsetPath(path: Path64, dx: bigint, dy: bigint): Path64 {
  const result: Path64 = new Path64();
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

export function scalePath<TPath extends Path64 | PathD>(
  path: TPath,
  scale: number,
): TPath {
  if (isPath64(path)) {
    if (isAlmostZero(scale - 1)) {
      return new Path64(...path) as TPath;
    }
    const result: Path64 = new Path64();

    for (const pt of path) {
      result.push({
        x: numberToBigInt(Number(pt.x) * scale),
        y: numberToBigInt(Number(pt.y) * scale),
      });
    }
    return result as TPath;
  } else {
    const result: PathD = new PathD();
    if (isAlmostZero(scale - 1)) {
      for (const pt of path as PathD) {
        result.push(clonePoint(pt));
      }
      return result as TPath;
    }

    for (const pt of path as PathD) {
      result.push({ x: pt.x * scale, y: pt.y * scale });
    }
    return result as TPath;
  }
}

export function scalePaths<TPaths extends Paths64 | PathsD>(
  paths: TPaths,
  scale: number,
): TPaths {
  if (isPaths64(paths)) {
    if (isAlmostZero(scale - 1)) {
      return new Paths64(...paths) as TPaths;
    }

    const result = new Paths64();

    for (const path of paths) {
      const tmpPath: Path64 = new Path64();
      for (const pt of path) {
        tmpPath.push({
          x: numberToBigInt(Number(pt.x) * scale),
          y: numberToBigInt(Number(pt.y) * scale),
        });
      }
      result.push(tmpPath);
    }

    return result as TPaths;
  } else if (isPathsD(paths)) {
    if (isAlmostZero(scale - 1)) {
      return new PathsD(...paths) as TPaths;
    }

    const result = new PathsD();

    for (const path of paths as PathsD) {
      const tmpPath: PathD = new PathD();
      for (const pt of path) {
        tmpPath.push({ x: pt.x * scale, y: pt.y * scale });
      }
      result.push(tmpPath);
    }

    return result as TPaths;
  }
  throw new Error("todo: change message");
}

export function scalePath64(path: PathD, scale: number): Path64 {
  const result: Path64 = new Path64();
  for (const pt of path) {
    result.push({
      x: numberToBigInt(Number(pt.x) * scale),
      y: numberToBigInt(Number(pt.y) * scale),
    });
  }
  return result;
}

export function scalePathD(path: Path64, scale: number): PathD {
  const result: PathD = new PathD();
  for (const pt of path) {
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

export function path64(path: PathD): Path64 {
  return scalePath64(path, 1);
}

export function paths64(paths: PathsD): Paths64 {
  return scalePaths64(paths, 1);
}

export function pathD(path: Path64): PathD {
  return scalePathD(path, 1);
}

export function pathsD(paths: Paths64): PathsD {
  return scalePathsD(paths, 1);
}

export function translatePath(path: Path64, dx: bigint, dy: bigint): Path64;
export function translatePath(path: PathD, dx: number, dy: number): PathD;
export function translatePath<TPath extends Path64 | PathD>(
  path: TPath,
  dx: bigint | number,
  dy: bigint | number,
): TPath {
  if (isPath64(path) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Path64();
    for (const pt of path) {
      result.push({ x: pt.x + dx, y: pt.y + dy });
    }
    return result as TPath;
  } else if (
    isPathD(path) &&
    typeof dx === "number" &&
    typeof dy === "number"
  ) {
    const result = new PathD();
    for (const pt of path) {
      result.push({ x: pt.x + dx, y: pt.y + dy });
    }
    return result as TPath;
  }
  throw new Error("todo: change message");
}

export function translatePaths(paths: Paths64, dx: bigint, dy: bigint): Paths64;
export function translatePaths(paths: PathsD, dx: number, dy: number): PathsD;
export function translatePaths<TPaths extends Paths64 | PathsD>(
  paths: TPaths,
  dx: bigint | number,
  dy: bigint | number,
): TPaths {
  if (isPaths64(paths) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Paths64();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result as TPaths;
  } else if (
    isPathsD(paths) &&
    typeof dx === "number" &&
    typeof dy === "number"
  ) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result as TPaths;
  }
  throw new Error("todo: change message");
}

export function reversePath<TPath extends Path64 | PathD>(path: TPath): TPath {
  if (isPath64(path)) {
    const result = new Path64();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(clonePoint(path[i]));
    }
    return result as TPath;
  } else if (isPathD(path)) {
    const result = new PathD();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(clonePoint(path[i]));
    }
    return result as TPath;
  }
  throw Error("todo: change message");
}

export function reversePaths<TPaths extends Paths64 | PathsD>(
  paths: TPaths,
): TPaths {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result as TPaths;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result as TPaths;
  }
  throw Error("todo: change message");
}

export function getBounds(path: Path64): Rect64;
export function getBounds(paths: Paths64): Rect64;
export function getBounds(path: PathD): RectD;
export function getBounds(paths: PathsD): RectD;

export function getBounds(
  pathOrPaths: Path64 | Paths64 | PathD | PathsD,
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

export function makePath64(arr: ArrayLike<number>): Path64;
export function makePath64(arr: ArrayLike<bigint>): Path64;
export function makePath64(arr: ArrayLike<number> | ArrayLike<bigint>) {
  const path: Path64 = new Path64();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: BigInt(arr[i]), y: BigInt(arr[i + 1]) });
  }
  return path;
}

export function makePathD(arr: ArrayLike<number>): PathD {
  const path: PathD = new PathD();
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
  path: PathD,
  minEdgeLenSqrd: number,
  isClosedPath: boolean,
): PathD {
  const cnt = path.length;
  const result: PathD = new PathD();
  if (cnt === 0) {
    return result;
  }
  let lastPt = clonePoint(path[0]);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (!pointsNearEqual(lastPt, path[i], minEdgeLenSqrd)) {
      lastPt = clonePoint(path[i]);
      result.push(lastPt);
    }
  }

  if (isClosedPath && pointsNearEqual(lastPt, result[0], minEdgeLenSqrd)) {
    result.length = result.length - 1;
  }
  return result;
}

export function stripDuplicates(path: Path64, isClosedPath: boolean): Path64 {
  const cnt = path.length;
  const result: Path64 = new Path64();
  if (cnt === 0) {
    return result;
  }
  let lastPt = clonePoint(path[0]);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (Point64.notEquals(lastPt, path[i])) {
      lastPt = clonePoint(path[i]);
      result.push(lastPt);
    }
  }

  if (isClosedPath && Point64.equals(lastPt, path[0])) {
    result.length = result.length - 1;
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

export function ramerDouglasPeucker(path: Path64, epsilon: number): Path64;
export function ramerDouglasPeucker(path: Paths64, epsilon: number): Paths64;
export function ramerDouglasPeucker(path: PathD, epsilon: number): PathD;
export function ramerDouglasPeucker(path: PathsD, epsilon: number): PathsD;
export function ramerDouglasPeucker<
  TPathOrPaths extends Path64 | PathD | Paths64 | PathsD,
>(pathOrPaths: TPathOrPaths, epsilon: number): TPathOrPaths {
  if (isPaths64(pathOrPaths)) {
    const result = new Paths64();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result as TPathOrPaths;
  } else if (isPathsD(pathOrPaths)) {
    const result = new PathsD();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result as TPathOrPaths;
  } else if (isPath64(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return new Path64(...pathOrPaths) as TPathOrPaths;
    }
    const result = new Path64();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false,
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);

    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(clonePoint(pathOrPaths[i]));
      }
    }

    return result as TPathOrPaths;
  } else if (isPathD(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return new PathD(...pathOrPaths) as TPathOrPaths;
    }
    const result = new PathD();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false,
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);

    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(clonePoint(pathOrPaths[i]));
      }
    }

    return result as TPathOrPaths;
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
  path: Path64,
  epsilon: number,
  isClosedPath?: boolean,
): Path64;
export function simplifyPath(
  path: PathD,
  epsilon: number,
  isClosedPath?: boolean,
): PathD;
export function simplifyPath<TPath extends Path64 | PathD>(
  path: TPath,
  epsilon: number,
  isClosedPath: boolean = false,
): TPath {
  const len = path.length;
  const high = len - 1;
  const epsSqr = sqr(epsilon);

  if (len < 4) {
    if (isPath64(path)) {
      return new Path64(...path) as TPath;
    } else if (isPathD(path)) {
      return new PathD(...path) as TPath;
    }
    throw new Error("todo: change message");
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
    dsq[0] = perpendicDistFromLineSqrd(path[0], path[high], path[1]);
    dsq[high] = perpendicDistFromLineSqrd(path[high], path[0], path[high - 1]);
  } else {
    dsq[0] = Infinity;
    dsq[high] = Infinity;
  }

  for (let i = 1; i < high; i++) {
    dsq[i] = perpendicDistFromLineSqrd(path[i], path[i - 1], path[i + 1]);
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
      dsq[curr] = perpendicDistFromLineSqrd(path[curr], path[prev], path[next]);
      if (next !== high || isClosedPath) {
        dsq[curr] = perpendicDistFromLineSqrd(
          path[next],
          path[curr],
          path[next2],
        );
      }
      curr = next;
    } else {
      flags[curr] = true;
      curr = next;

      next = getNext(next, high, flags);
      prior2 = getNext(prev, high, flags);
      dsq[curr] = perpendicDistFromLineSqrd(path[curr], path[prev], path[next]);
      if (prev !== 0 || isClosedPath) {
        dsq[prev] = perpendicDistFromLineSqrd(
          path[prev],
          path[prior2],
          path[curr],
        );
      }
    }
  }

  if (isPath64(path)) {
    const result = new Path64();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(clonePoint(path[i]));
      }
    }
    return result as TPath;
  } else if (isPathD(path)) {
    const result = new PathD();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(clonePoint(path[i]));
      }
    }
    return result as TPath;
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

export function trimCollinear(path: Path64, isOpen?: boolean): Path64;
export function trimCollinear(
  path: PathD,
  precision: number,
  isOpen?: boolean,
): PathD;
export function trimCollinear<TPath extends Path64 | PathD>(
  path: TPath,
  isOpenOrPrecision?: boolean | number,
  mayBeIsOpen: boolean = false,
): TPath {
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
    let p = scalePath64(path as PathD, scale);
    p = trimCollinear(p, isOpen);
    return scalePathD(p, 1 / scale) as TPath;
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
        crossProduct(
          path[len - 1] as Point64,
          path[i] as Point64,
          path[i + 1] as Point64,
        ) === 0
      ) {
        i++;
      }
      while (
        i < len - 1 &&
        crossProduct(
          path[len - 2] as Point64,
          path[len - 1] as Point64,
          path[i] as Point64,
        ) === 0
      ) {
        len--;
      }
    }

    if (len - 1 < 3) {
      if (
        !isOpen ||
        len < 2 ||
        Point64.equals(path[0] as Point64, path[1] as Point64)
      ) {
        return new Path64() as TPath;
      }

      return new Path64(...path) as TPath;
    }
    const result: Path64 = new Path64();

    let last = path[i] as Point64;

    for (i++; i < len - 1; i++) {
      if (
        crossProduct(last, path[i] as Point64, path[i + 1] as Point64) === 0
      ) {
        continue;
      }
      last = path[i] as Point64;
      result.push(clonePoint(last));
    }

    if (isOpen) {
      result.push(clonePoint(path[len - 1] as Point64));
    } else if (
      crossProduct(last, path[len - 1] as Point64, result[0] as Point64) !== 0
    ) {
      result.push(clonePoint(path[len - 1] as Point64));
    } else {
      while (
        result.length > 2 &&
        crossProduct(
          result[result.length - 1],
          result[result.length - 2],
          result[0],
        ) === 0
      ) {
        result.length = result.length - 1;
      }
      if (result.length < 3) {
        result.length = 0;
      }
    }

    return result as TPath;
  }
  throw new Error("todo: change message");
}

export function pointInPolygon(
  pt: Point64,
  polygon: Path64,
): PointInPolygonResult;
export function pointInPolygon(
  pt: PointD,
  polygon: PathD,
  precision?: number,
): PointInPolygonResult;
export function pointInPolygon(
  pt: Point64 | PointD,
  polygon: Path64 | PathD,
  precision: number = 2,
) {
  if (isPoint64(pt)) {
    return InternalpointInPolygon(pt, polygon as Path64);
  } else {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const p = Point64.createScaledPoint(pt.x, pt.y, scale);
    const path = scalePath64(polygon as PathD, scale);
    return InternalpointInPolygon(p, path);
  }
}

export function ellipse(
  center: Point64,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): Path64;
export function ellipse(
  center: PointD,
  radiusX: number,
  radiusY?: number,
  steps?: number,
): PathD;
export function ellipse(
  center: Point64 | PointD,
  radiusX: number,
  radiusY: number = 0,
  steps: number = 0,
): Path64 & PathD {
  if (isPoint64(center)) {
    if (radiusX <= 0) {
      return new Path64() as Path64 & PathD;
    }
  } else if (isPointD(center)) {
    if (radiusX <= 0) {
      return new PathD() as Path64 & PathD;
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
    const result: Path64 = new Path64();
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
    return result as Path64 & PathD;
  } else {
    const centerX = center.x;
    const centerY = center.y;
    const result: PathD = new PathD();
    result.push({ x: centerX + radiusX, y: center.y });
    for (let i = 1; i < steps; i++) {
      result.push({ x: centerX + radiusX * dx, y: centerY + radiusY * dy });
      const x = dx * co - dy * si;
      dy = dy * co + dx * si;
      dx = x;
    }
    return result as Path64 & PathD;
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
