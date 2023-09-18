import { InternalClipper } from "./Core/InternalClipper";
import { ClipType, FillRule, PathType } from "./Core/CoreEnums";
import { Path64, isPath64 } from "./Core/Path64";
import { PathD, isPathD } from "./Core/PathD";
import { Paths64, isPaths64 } from "./Core/Paths64";
import { PathsD, isPathsD } from "./Core/PathsD";
import { Point64, isPoint64 } from "./Core/Point64";
import { PointD, isPointD } from "./Core/PointD";
import { Rect64 } from "./Core/Rect64";
import { RectD } from "./Core/RectD";
import { Clipper64 } from "./Engine/Clipper64";
import { ClipperD } from "./Engine/ClipperD";
import { PointInPolygonResult } from "./Engine/EngineEnums";
import { PolyPath64 } from "./Engine/PolyPath64";
import { PolyPathD } from "./Engine/PolyPathD";
import { PolyTree64 } from "./Engine/PolyTree64";
import { PolyTreeD } from "./Engine/PolyTreeD";
import { minkowski } from "./Minkowski/Minkowski";
import { ClipperOffset } from "./Offset/ClipperOffset";
import { EndType, JoinType } from "./Offset/OffsetEnums";
import { RectClip64 } from "./RectClip/RectClip64";
import { RectClipLines64 } from "./RectClip/RectClipLines64";
import { PolyPathBase } from "./Engine/PolyPathBase";

const clonePoint = <TPoint extends Point64 | PointD>(pt: TPoint): TPoint => {
  return { x: pt.x, y: pt.y } as TPoint;
};

export interface Clipper {
  invalidRect64: { (): Rect64 };
  invalidRectD: { (): RectD };
  intersect: {
    (subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
    (
      subject: PathsD,
      clip: PathsD,
      fillRule: FillRule,
      precision?: number,
    ): PathsD;
  };
  union: {
    (subject: Paths64, fillRule: FillRule): Paths64;
    (subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
    (subject: PathsD, fillRule: FillRule): PathsD;
    (
      subject: PathsD,
      clip: PathsD,
      fillRule: FillRule,
      precision?: number,
    ): PathsD;
  };
  difference: {
    (subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
    (
      subject: PathsD,
      clip: PathsD,
      fillRule: FillRule,
      precision?: number,
    ): PathsD;
  };
  xor: {
    (subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
    (
      subject: PathsD,
      clip: PathsD,
      fillRule: FillRule,
      precision?: number,
    ): PathsD;
  };
  booleanOp: {
    (
      clipType: ClipType,
      subject: Paths64,
      clip: Paths64 | undefined,
      fillRule: FillRule,
    ): Paths64;
    (
      clipType: ClipType,
      subject: Paths64,
      clip: Paths64 | undefined,
      polytree: PolyTree64,
      fillRule: FillRule,
    ): void;
    (
      clipType: ClipType,
      subject: PathsD,
      clip: PathsD | undefined,
      fillRule: FillRule,
      precision?: number,
    ): PathsD;
    (
      clipType: ClipType,
      subject: PathsD,
      clip: PathsD | undefined,
      polytree: PolyTreeD,
      fillRule: FillRule,
      precision?: number,
    ): void;
    <TPaths extends Paths64 | PathsD>(
      clipType: ClipType,
      subject: TPaths,
      clip: TPaths | undefined,
      fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD,
      precisionOrFillRule?: number | FillRule,
      precision?: number,
    ): TPaths | void;
  };
  inflatePaths: {
    (
      paths: Paths64,
      delta: number,
      joinType: JoinType,
      endType: EndType,
      miterLimit?: number,
    ): Paths64;
    (
      paths: PathsD,
      delta: number,
      joinType: JoinType,
      endType: EndType,
      miterLimit?: number,
      precision?: number,
    ): PathsD;
  };
  rectClip: {
    (rect: Rect64, pathOrpaths: Path64 | Paths64): Paths64;
    (rect: RectD, pathOrPaths: PathD | PathsD, precision?: number): PathsD;
  };
  rectClipLines: {
    (rect: Rect64, paths: Paths64): Paths64;
    (rect: Rect64, path: Path64): Paths64;
    (rect: RectD, paths: PathsD, precision?: number): PathsD;
    (rect: RectD, path: PathD, precision?: number): PathsD;
  };
  minkowskiSum64: {
    (pattern: Path64, path: Path64, isClosed: boolean): Paths64;
  };
  minkowskiSumD: { (pattern: PathD, path: PathD, isClosed: boolean): PathsD };
  minkowskiDiff64: {
    (pattern: Path64, path: Path64, isClosed: boolean): Paths64;
  };
  minkowskiDiffD: { (pattern: PathD, path: PathD, isClosed: boolean): PathsD };
  area: { (path: Path64 | PathD | Paths64 | PathsD): number };
  isPositive: { (poly: Path64 | PathD): boolean };
  path64ToString: { (path: Path64): string };
  paths64ToString: { (paths: Paths64): string };
  pathDToString: { (path: PathD): string };
  pathsDToString: { (paths: PathsD): string };
  offsetPath: { (path: Path64, dx: bigint, dy: bigint): Path64 };
  scalePoint64: { (pt: Point64, scale: number): Point64 };
  scalePointD: { (pt: Point64, scale: number): PointD };
  scaleRect: { (rec: RectD, scale: number): Rect64 };
  scalePath: {
    <TPath extends Path64 | PathD>(path: TPath, scale: number): TPath;
  };
  scalePaths: {
    <TPaths extends Paths64 | PathsD>(paths: TPaths, scale: number): TPaths;
  };
  scalePath64: { (path: PathD, scale: number): Path64 };
  scalePaths64: { (paths: PathsD, scale: number): Paths64 };
  scalePathD: { (path: Path64, scale: number): PathD };
  scalePathsD: { (paths: Paths64, scale: number): PathsD };
  path64: { (path: PathD): Path64 };
  paths64: { (paths: PathsD): Paths64 };
  pathD: { (path: Path64): PathD };
  pathsD: { (paths: Paths64): PathsD };
  translatePath: {
    (path: Path64, dx: bigint, dy: bigint): Path64;
    (path: PathD, dx: number, dy: number): PathD;
  };
  translatePaths: {
    (paths: Paths64, dx: bigint, dy: bigint): Paths64;
    (paths: PathsD, dx: number, dy: number): PathsD;
  };
  reversePath: {
    (path: Path64): Path64;
    (path: PathD): PathD;
  };
  reversePaths: {
    (paths: Paths64): Paths64;
    (paths: PathsD): PathsD;
  };
  getBounds64: {
    (path: Path64): Rect64;
    (paths: Paths64): Rect64;
  };
  getBoundsD: {
    (path: PathD): RectD;
    (paths: PathsD): RectD;
  };
  makePath64: {
    (arr: bigint[]): Path64;
    (arr: Int32Array): Path64;
    (arr: BigInt64Array): Path64;
  };
  makePathD: {
    (arr: number[]): PathD;
    (arr: Float64Array): PathD;
  };
  sqr: { (value: number): number };
  pointsNearEqual: {
    (pt1: PointD, pt2: PointD, distanceSqrd: number): boolean;
  };
  stripNearDuplicates: {
    (path: PathD, minEdgeLenSqrd: number, isClosedPath: boolean): PathD;
  };
  stripDuplicates: { (path: Path64, isClosedPath: boolean): Path64 };
  addPolyNodeToPaths: { (polyPath: PolyPath64, paths: Paths64): void };
  polyTreeToPaths64: { (polyTree: PolyTree64): Paths64 };
  addPolyNodeToPathsD: { (polyPath: PolyPathD, paths: PathsD): void };
  polyTreeToPathsD: { (polyTree: PolyTreeD): PathsD };
  perpendicDistFromLineSqrd: {
    <TPoint extends Point64 | PointD>(
      pt: TPoint,
      line1: TPoint,
      line2: TPoint,
    ): number;
  };
  rdp: {
    (
      path: Path64 | PathD,
      begin: number,
      end: number,
      epsSqrd: number,
      flags: boolean[],
    ): void;
  };
  ramerDouglasPeucker: {
    (path: Path64, epsilon: number): Path64;
    (path: Paths64, epsilon: number): Paths64;
    (path: PathD, epsilon: number): PathD;
    (path: PathsD, epsilon: number): PathsD;
  };
  getNext: { (current: number, high: number, flags: boolean[]): number };
  getPrior: { (current: number, high: number, flags: boolean[]): number };
  simplifyPath: {
    (path: Path64, epsilon: number, isClosedPath?: boolean): Path64;
    (path: PathD, epsilon: number, isClosedPath?: boolean): PathD;
  };
  simplifyPaths: {
    (paths: Paths64, epsilon: number, isClosedPaths?: boolean): Paths64;
    (paths: PathsD, epsilon: number, isClosedPaths?: boolean): PathsD;
  };
  trimCollinear: {
    (path: Path64, isOpen?: boolean): Path64;
    (path: PathD, precision: number, isOpen?: boolean): PathD;
  };
  pointInPolygon: {
    (pt: Point64, polygon: Path64): PointInPolygonResult;
    (pt: PointD, polygon: PathD, precision?: number): PointInPolygonResult;
  };
  ellipse: {
    (
      center: Point64,
      radiusX: number,
      radiusY?: number,
      steps?: number,
    ): Path64;
    (center: PointD, radiusX: number, radiusY?: number, steps?: number): PathD;
  };
  showPolyPathStructure: { (pp: PolyPathBase, level: number): void };
  showPolyTreeStructure: { (polytree: PolyTree64 | PolyTreeD): void };
}

export const Clipper: Clipper = {
  invalidRect64: () => new Rect64(false),
  invalidRectD: () => new RectD(false),
  intersect<TPaths extends Paths64 | PathsD>(
    subject: TPaths,
    clip: TPaths,
    fillRule: FillRule,
    precision: number = 2,
  ): TPaths {
    return Clipper.booleanOp(
      ClipType.Intersection,
      subject,
      clip,
      fillRule,
      precision,
    ) as TPaths;
  },
  union<TPaths extends Paths64 | PathsD>(
    subject: TPaths,
    fillRuleOrClip: TPaths | FillRule,
    fillRule?: FillRule,
    precision: number = 2,
  ): TPaths {
    if (typeof fillRuleOrClip === "number") {
      return Clipper.booleanOp(
        ClipType.Union,
        subject,
        undefined,
        fillRuleOrClip as FillRule,
        precision,
      ) as TPaths;
    } else {
      return Clipper.booleanOp(
        ClipType.Union,
        subject,
        fillRuleOrClip,
        fillRule!,
        precision,
      ) as TPaths;
    }
  },
  difference<TPaths extends Paths64 | PathsD>(
    subject: TPaths,
    clip: TPaths,
    fillRule: FillRule,
    precision: number = 2,
  ): TPaths {
    return Clipper.booleanOp(
      ClipType.Difference,
      subject,
      clip,
      fillRule,
      precision,
    ) as TPaths;
  },
  xor<TPaths extends Paths64 | PathsD>(
    subject: TPaths,
    clip: TPaths,
    fillRule: FillRule,
    precision: number = 2,
  ): TPaths {
    return Clipper.booleanOp(
      ClipType.Xor,
      subject,
      clip,
      fillRule,
      precision,
    ) as TPaths;
  },
  booleanOp<TPaths extends Paths64 | PathsD>(
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
        c.execute(
          clipType,
          precisionOrFillRule! as FillRule,
          fillRuleOrPolyTree,
        );
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
        c.execute(
          clipType,
          precisionOrFillRule as FillRule,
          fillRuleOrPolyTree,
        );
        return;
      }
    }
    throw new Error("todo: change message");
  },
  inflatePaths<TPaths extends Paths64 | PathsD>(
    paths: TPaths,
    delta: number,
    joinType: JoinType,
    endType: EndType,
    miterLimit: number = 2.0,
    precision: number = 2,
  ): TPaths {
    if (paths instanceof Paths64) {
      const co = new ClipperOffset(miterLimit);
      co.addPaths(paths, joinType, endType);
      const solution = new Paths64();
      co.execute(delta, solution);
      return solution as TPaths;
    } else {
      InternalClipper.checkPrecision(precision);
      const scale = Math.pow(10, precision);
      const tmp = Clipper.scalePaths64(paths, scale);
      const co = new ClipperOffset(miterLimit);
      co.addPaths(tmp, joinType, endType);
      co.execute(delta * scale, tmp);
      return Clipper.scalePathsD(tmp, 1 / scale) as TPaths;
    }
  },
  rectClip(
    rect: Rect64 | RectD,
    pathOrPaths: Paths64 | Path64 | PathsD | PathD,
    precision: number = 2,
  ): Paths64 & PathsD {
    if (rect instanceof Rect64) {
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
      InternalClipper.checkPrecision(precision);
      if (rect.isEmpty() || pathOrPaths.length === 0) {
        return new PathsD() as Paths64 & PathsD;
      }

      const scale = Math.pow(10, precision);

      let tmpPath: Paths64;

      if (isPathsD(pathOrPaths)) {
        tmpPath = Clipper.scalePaths64(pathOrPaths, scale);
      } else if (isPathD(pathOrPaths)) {
        tmpPath = new Paths64();
        tmpPath.push(Clipper.scalePath64(pathOrPaths, scale));
      } else {
        throw new Error("todo: change message");
      }

      const r = Clipper.scaleRect(rect, scale);
      const rc = new RectClip64(r);
      tmpPath = rc.execute(tmpPath);
      return Clipper.scalePathsD(tmpPath, 1 / scale) as Paths64 & PathsD;
    }
  },
  rectClipLines(
    rect: Rect64 | RectD,
    pathOrPaths: Paths64 | Path64 | PathsD | PathD,
    precision: number = 2,
  ): Paths64 & PathsD {
    if (rect instanceof Rect64) {
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
      InternalClipper.checkPrecision(precision);
      if (rect.isEmpty() || pathOrPaths.length === 0) {
        return new PathsD() as Paths64 & PathsD;
      }

      const scale = Math.pow(10, precision);

      let tmpPath: Paths64;

      if (isPathsD(pathOrPaths)) {
        tmpPath = Clipper.scalePaths64(pathOrPaths, scale);
      } else {
        tmpPath = new Paths64();
        tmpPath.push(Clipper.scalePath64(pathOrPaths as PathD, scale));
      }

      const r = Clipper.scaleRect(rect, scale);
      const rc = new RectClipLines64(r);
      tmpPath = rc.execute(tmpPath);
      return Clipper.scalePathsD(tmpPath, 1 / scale) as Paths64 & PathsD;
    }
  },
  minkowskiSum64(pattern, path, isClosed) {
    return minkowski.sum64(pattern, path, isClosed);
  },
  minkowskiSumD(pattern, path, isClosed) {
    return minkowski.sumD(pattern, path, isClosed);
  },
  minkowskiDiff64(pattern, path, isClosed) {
    return Clipper.minkowskiDiff64(pattern, path, isClosed);
  },
  minkowskiDiffD(pattern, path, isClosed) {
    return Clipper.minkowskiDiffD(pattern, path, isClosed);
  },
  area(pathOrPaths: Path64 | PathD | Paths64 | PathsD): number {
    let area = 0;
    if (isPaths64(pathOrPaths) || isPathsD(pathOrPaths)) {
      for (const path of pathOrPaths) {
        area += Clipper.area(path);
      }
    } else {
      if (pathOrPaths.length < 3) {
        return 0;
      }

      let prevPt = pathOrPaths[pathOrPaths.length - 1];

      for (const pt of pathOrPaths) {
        if (isPoint64(pt)) {
          area += Number(
            ((prevPt.y as bigint) + pt.y) * ((prevPt.x as bigint) - pt.x),
          );
        } else {
          area += ((prevPt.y as number) + pt.y) * ((prevPt.x as number) - pt.x);
        }
        prevPt = pt;
      }

      area *= 0.5;
    }

    return area;
  },
  isPositive(poly: Path64 | PathD) {
    return Clipper.area(poly) >= 0;
  },
  path64ToString(path: Path64) {
    let result = "";
    for (const pt of path) {
      result += Point64.toString(pt);
    }
    return result + "\n";
  },
  paths64ToString(paths: Paths64) {
    let result = "";
    for (const path of paths) {
      result += Clipper.path64ToString(path);
    }
    return result;
  },
  pathDToString(path: PathD) {
    let result = "";
    for (const pt of path) {
      result += PointD.toString(pt);
    }
    return result + "\n";
  },
  pathsDToString(paths: PathsD) {
    let result = "";
    for (const path of paths) {
      result += Clipper.pathDToString(path);
    }
    return result;
  },
  offsetPath(path: Path64, dx: bigint, dy: bigint): Path64 {
    const result: Path64 = new Path64();
    for (const pt of path) {
      result.push({ x: pt.x + dx, y: pt.y + dy });
    }

    return result;
  },
  scalePoint64(pt, scale) {
    return {
      x: BigInt(Math.round(Number(pt.x) * scale)),
      y: BigInt(Math.round(Number(pt.y) * scale)),
    };
  },
  scalePointD(pt, scale) {
    return {
      x: Number(pt.x) * scale,
      y: Number(pt.y) * scale,
    };
  },
  scaleRect(rec, scale) {
    return new Rect64(
      BigInt(Math.round(Number(rec.left) * scale)),
      BigInt(Math.round(Number(rec.top) * scale)),
      BigInt(Math.round(Number(rec.right) * scale)),
      BigInt(Math.round(Number(rec.bottom) * scale)),
    );
  },
  scalePath<TPath extends Path64 | PathD>(path: TPath, scale: number): TPath {
    if (isPath64(path)) {
      if (InternalClipper.isAlmostZero(scale - 1)) {
        return new Path64(path) as TPath;
      }
      const result: Path64 = new Path64();

      for (const pt of path) {
        result.push({
          x: BigInt(Math.round(Number(pt.x) * scale)),
          y: BigInt(Math.round(Number(pt.y) * scale)),
        });
      }
      return result as TPath;
    } else {
      const result: PathD = new PathD();
      if (InternalClipper.isAlmostZero(scale - 1)) {
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
  },
  scalePaths<TPaths extends Paths64 | PathsD>(
    paths: TPaths,
    scale: number,
  ): TPaths {
    if (isPaths64(paths)) {
      if (InternalClipper.isAlmostZero(scale - 1)) {
        return new Paths64(paths) as TPaths;
      }

      const result = new Paths64();

      for (const path of paths) {
        const tmpPath: Path64 = new Path64();
        for (const pt of path) {
          tmpPath.push({
            x: BigInt(Math.round(Number(pt.x) * scale)),
            y: BigInt(Math.round(Number(pt.y) * scale)),
          });
        }
        result.push(tmpPath);
      }

      return result as TPaths;
    } else if (isPathsD(paths)) {
      if (InternalClipper.isAlmostZero(scale - 1)) {
        return new PathsD(paths) as TPaths;
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
  },
  scalePath64(path, scale) {
    const result: Path64 = new Path64();
    for (const pt of path) {
      result.push({
        x: BigInt(Math.round(Number(pt.x) * scale)),
        y: BigInt(Math.round(Number(pt.y) * scale)),
      });
    }
    return result;
  },
  scalePathD(path, scale) {
    const result: PathD = new PathD();
    for (const pt of path) {
      result.push({ x: Number(pt.x) * scale, y: Number(pt.y) * scale });
    }
    return result;
  },
  scalePaths64(paths, scale) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(Clipper.scalePath64(path, scale));
    }
    return result;
  },
  scalePathsD(paths, scale) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(Clipper.scalePathD(path, scale));
    }
    return result;
  },
  path64(path) {
    return Clipper.scalePath64(path, 1);
  },
  paths64(paths) {
    return Clipper.scalePaths64(paths, 1);
  },
  pathD(path) {
    return Clipper.scalePathD(path, 1);
  },
  pathsD(paths) {
    return Clipper.scalePathsD(paths, 1);
  },
  translatePath<TPath extends Path64 | PathD>(
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
  },
  translatePaths<TPaths extends Paths64 | PathsD>(
    paths: TPaths,
    dx: bigint | number,
    dy: bigint | number,
  ): TPaths {
    if (isPaths64(paths) && typeof dx === "bigint" && typeof dy === "bigint") {
      const result = new Paths64();
      for (const path of paths) {
        result.push(Clipper.translatePath(path, dx, dy));
      }
      return result as TPaths;
    } else if (
      isPathsD(paths) &&
      typeof dx === "number" &&
      typeof dy === "number"
    ) {
      const result = new PathsD();
      for (const path of paths) {
        result.push(Clipper.translatePath(path, dx, dy));
      }
      return result as TPaths;
    }
    throw new Error("todo: change message");
  },
  reversePath<TPath extends Path64 | PathD>(path: TPath): TPath {
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
  },
  reversePaths<TPaths extends Paths64 | PathsD>(paths: TPaths): TPaths {
    if (isPaths64(paths)) {
      const result = new Paths64();
      for (const path of paths) {
        result.push(Clipper.reversePath(path));
      }
      return result as TPaths;
    } else if (isPathsD(paths)) {
      const result = new PathsD();
      for (const path of paths) {
        result.push(Clipper.reversePath(path));
      }
      return result as TPaths;
    }
    throw Error("todo: change message");
  },
  getBounds64(pathOrPaths) {
    const result = Clipper.invalidRect64();
    if (pathOrPaths instanceof Paths64) {
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
    } else {
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
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  },
  getBoundsD(pathOrPaths) {
    const result = Clipper.invalidRectD();
    if (pathOrPaths instanceof PathsD) {
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
    } else {
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
    }
    return result.left === Infinity ? new RectD() : result;
  },
  makePath64(arr) {
    const path: Path64 = new Path64();
    for (let i = 0; i < arr.length; i = i + 2) {
      path.push({ x: BigInt(arr[i]), y: BigInt(arr[i + 1]) });
    }
    return path;
  },
  makePathD(arr) {
    const path: PathD = new PathD();
    for (let i = 0; i < arr.length; i = i + 2) {
      path.push({ x: arr[i], y: arr[i + 1] });
    }
    return path;
  },
  sqr(value) {
    return value * value;
  },
  pointsNearEqual(pt1, pt2, distanceSqrd) {
    return (
      Clipper.sqr(pt1.x - pt2.x) + Clipper.sqr(pt1.y - pt2.y) < distanceSqrd
    );
  },
  stripNearDuplicates(path, minEdgeLenSqrd, isClosedPath) {
    const cnt = path.length;
    const result: PathD = new PathD();
    if (cnt === 0) {
      return result;
    }
    let lastPt = clonePoint(path[0]);
    result.push(lastPt);
    for (let i = 1; i < cnt; i++) {
      if (!Clipper.pointsNearEqual(lastPt, path[i], minEdgeLenSqrd)) {
        lastPt = clonePoint(path[i]);
        result.push(lastPt);
      }
    }

    if (
      isClosedPath &&
      Clipper.pointsNearEqual(lastPt, result[0], minEdgeLenSqrd)
    ) {
      result.length = result.length - 1;
    }
    return result;
  },
  stripDuplicates(path, isClosedPath) {
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
  },
  addPolyNodeToPaths(polyPath, paths) {
    if (polyPath.polygon!.length > 0) {
      paths.push(polyPath.polygon!);
    }
    for (let i = 0; i < polyPath.length; i++) {
      Clipper.addPolyNodeToPaths(polyPath._childs[i] as PolyPath64, paths);
    }
  },
  polyTreeToPaths64(polyTree) {
    const result = new Paths64();

    for (let i = 0; i < polyTree.length; i++) {
      Clipper.addPolyNodeToPaths(polyTree._childs[i] as PolyPath64, result);
    }

    return result;
  },
  addPolyNodeToPathsD(polyPath, paths) {
    if (polyPath.polygon!.length > 0) {
      paths.push(polyPath.polygon!);
    }
    for (let i = 0; i < polyPath.length; i++) {
      Clipper.addPolyNodeToPathsD(polyPath._childs[i] as PolyPathD, paths);
    }
  },
  polyTreeToPathsD(polyTree) {
    const result = new PathsD();

    for (let i = 0; i < polyTree.length; i++) {
      Clipper.addPolyNodeToPathsD(polyTree._childs[i] as PolyPathD, result);
    }

    return result;
  },
  perpendicDistFromLineSqrd(pt, line1, line2) {
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
    return Clipper.sqr(x1 * y2 - x2 * y1) / (x2 * x2 + y2 * y2);
  },
  rdp(path, begin, end, epsSqrd, flags) {
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
      const d = this.perpendicDistFromLineSqrd(path[i], path[begin], path[end]);
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
      Clipper.rdp(path, begin, idx, epsSqrd, flags);
    }
    if (idx < end - 1) {
      Clipper.rdp(path, begin, idx, epsSqrd, flags);
    }
  },
  ramerDouglasPeucker<TPathOrPaths extends Path64 | PathD | Paths64 | PathsD>(
    pathOrPaths: TPathOrPaths,
    epsilon: number,
  ): TPathOrPaths {
    if (isPaths64(pathOrPaths)) {
      const result = new Paths64();
      for (const path of pathOrPaths) {
        result.push(Clipper.ramerDouglasPeucker(path, epsilon));
      }
      return result as TPathOrPaths;
    } else if (isPathsD(pathOrPaths)) {
      const result = new PathsD();
      for (const path of pathOrPaths) {
        result.push(Clipper.ramerDouglasPeucker(path, epsilon));
      }
      return result as TPathOrPaths;
    } else if (isPath64(pathOrPaths)) {
      const len = pathOrPaths.length;
      if (len < 5) {
        return new Path64(pathOrPaths) as TPathOrPaths;
      }
      const result = new Path64();
      const flags = Array.from(
        { length: len, [0]: true, [len - 1]: true },
        (val) => val ?? false,
      );
      Clipper.rdp(pathOrPaths, 0, len - 1, Clipper.sqr(epsilon), flags);

      for (let i = 0; i < len; i++) {
        if (flags[i]) {
          result.push(clonePoint(pathOrPaths[i]));
        }
      }

      return result as TPathOrPaths;
    } else if (isPathD(pathOrPaths)) {
      const len = pathOrPaths.length;
      if (len < 5) {
        return new PathD(pathOrPaths) as TPathOrPaths;
      }
      const result = new PathD();
      const flags = Array.from(
        { length: len, [0]: true, [len - 1]: true },
        (val) => val ?? false,
      );
      Clipper.rdp(pathOrPaths, 0, len - 1, Clipper.sqr(epsilon), flags);

      for (let i = 0; i < len; i++) {
        if (flags[i]) {
          result.push(clonePoint(pathOrPaths[i]));
        }
      }

      return result as TPathOrPaths;
    }
    throw new Error("todo: change message");
  },
  getNext(current, high, flags) {
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
  },
  getPrior(current, high, flags) {
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
  },
  simplifyPath<TPath extends Path64 | PathD>(
    path: TPath,
    epsilon: number,
    isClosedPath: boolean = false,
  ): TPath {
    const len = path.length;
    const high = len - 1;
    const epsSqr = Clipper.sqr(epsilon);

    if (len < 4) {
      if (isPath64(path)) {
        return new Path64(path) as TPath;
      } else if (isPathD(path)) {
        return new PathD(path) as TPath;
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
      dsq[0] = Clipper.perpendicDistFromLineSqrd(path[0], path[high], path[1]);
      dsq[high] = Clipper.perpendicDistFromLineSqrd(
        path[high],
        path[0],
        path[high - 1],
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }

    for (let i = 1; i < high; i++) {
      dsq[i] = Clipper.perpendicDistFromLineSqrd(
        path[i],
        path[i - 1],
        path[i + 1],
      );
    }

    while (true) {
      if (dsq[curr] > epsSqr) {
        start = curr;
        do {
          curr = Clipper.getNext(curr, high, flags);
        } while (curr !== start && dsq[curr] > epsSqr);
        if (curr === start) {
          break;
        }
      }

      prev = Clipper.getPrior(curr, high, flags);
      next = Clipper.getNext(curr, high, flags);

      if (next === prev) {
        break;
      }

      if (dsq[next] < dsq[curr]) {
        flags[next] = true;

        next = Clipper.getNext(next, high, flags);
        next2 = Clipper.getNext(next, high, flags);
        dsq[curr] = Clipper.perpendicDistFromLineSqrd(
          path[curr],
          path[prev],
          path[next],
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = Clipper.perpendicDistFromLineSqrd(
            path[next],
            path[curr],
            path[next2],
          );
        }
        curr = next;
      } else {
        flags[curr] = true;
        curr = next;

        next = Clipper.getNext(next, high, flags);
        prior2 = Clipper.getNext(prev, high, flags);
        dsq[curr] = Clipper.perpendicDistFromLineSqrd(
          path[curr],
          path[prev],
          path[next],
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = Clipper.perpendicDistFromLineSqrd(
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
  },
  simplifyPaths<TPaths extends Paths64 | PathsD>(
    paths: TPaths,
    epsilon: number,
    isClosedPath = false,
  ): TPaths {
    if (isPaths64(paths)) {
      const result = new Paths64();
      for (const path of paths) {
        result.push(Clipper.simplifyPath(path, epsilon, isClosedPath));
      }
      return result as TPaths;
    } else if (isPathsD(paths)) {
      const result = new PathsD();
      for (const path of paths) {
        result.push(Clipper.simplifyPath(path, epsilon, isClosedPath));
      }
      return result as TPaths;
    }
    throw new Error("todo: change message");
  },
  trimCollinear<TPath extends Path64 | PathD>(
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
      InternalClipper.checkPrecision(precision);
      const scale = Math.pow(10, precision);
      let p = Clipper.scalePath64(path as PathD, scale);
      p = Clipper.trimCollinear(p, isOpen);
      return Clipper.scalePathD(p, 1 / scale) as TPath;
    } else if (
      isPath64(path) &&
      (isOpenOrPrecision === undefined ||
        typeof isOpenOrPrecision === "boolean")
    ) {
      isOpen = isOpenOrPrecision ?? false;
      let len = path.length;
      let i: number = 0;
      if (!isOpen) {
        while (
          i < len - 1 &&
          InternalClipper.crossProduct(
            path[len - 1] as Point64,
            path[i] as Point64,
            path[i + 1] as Point64,
          ) === 0
        ) {
          i++;
        }
        while (
          i < len - 1 &&
          InternalClipper.crossProduct(
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

        return new Path64(path) as TPath;
      }
      const result: Path64 = new Path64();

      let last = path[i] as Point64;

      for (i++; i < len - 1; i++) {
        if (
          InternalClipper.crossProduct(
            last,
            path[i] as Point64,
            path[i + 1] as Point64,
          ) === 0
        ) {
          continue;
        }
        last = path[i] as Point64;
        result.push(clonePoint(last));
      }

      if (isOpen) {
        result.push(clonePoint(path[len - 1] as Point64));
      } else if (
        InternalClipper.crossProduct(
          last,
          path[len - 1] as Point64,
          result[0] as Point64,
        ) !== 0
      ) {
        result.push(clonePoint(path[len - 1] as Point64));
      } else {
        while (
          result.length > 2 &&
          InternalClipper.crossProduct(
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
  },
  pointInPolygon(pt, polygon, precision: number = 2) {
    if (isPoint64(pt)) {
      return InternalClipper.pointInPolygon(pt, polygon as Path64);
    } else {
      InternalClipper.checkPrecision(precision);
      const scale = Math.pow(10, precision);
      const p = Point64.createScaledPoint(pt.x, pt.y, scale);
      const path = Clipper.scalePath64(polygon as PathD, scale);
      return InternalClipper.pointInPolygon(p, path);
    }
  },
  ellipse(center, radiusX, radiusY = 0, steps = 0): Path64 & PathD {
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
      result.push({ x: BigInt(Math.round(centerX + radiusX)), y: center.y });
      for (let i = 1; i < steps; i++) {
        result.push({
          x: BigInt(Math.round(centerX + radiusX * dx)),
          y: BigInt(Math.round(centerY + radiusY * dy)),
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
  },
  showPolyPathStructure(pp, level) {
    const spaces = " ".repeat(level * 2);
    const caption = pp.getIsHole() ? "Hole " : "Outer ";
    if (pp.length === 0) {
      console.log(spaces + caption);
    } else {
      console.log(spaces + caption + `(${pp.length})`);
      for (const child of pp) {
        Clipper.showPolyPathStructure(child, level + 1);
      }
    }
  },
  showPolyTreeStructure(polytree) {
    console.log("Polytree Root");
    for (const child of polytree) {
      Clipper.showPolyPathStructure(child, 1);
    }
  },
} as const;
