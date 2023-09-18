import { Clipper } from "../Clipper2JS";
import { FillRule } from "../Core/CoreEnums";
import { Path64 } from "../Core/Path64";
import { PathD } from "../Core/PathD";
import { Paths64 } from "../Core/Paths64";
import { PathsD } from "../Core/PathsD";

const minkowskiInternal = (
  pattern: Path64,
  path: Path64,
  isSum: boolean,
  isClosed: boolean,
): Paths64 => {
  const delta = isClosed ? 0 : 1;
  const patLen = pattern.length;
  const pathLen = path.length;
  const tmp = new Paths64();

  for (const pathPt of path) {
    const path2: Path64 = new Path64();

    if (isSum) {
      for (const basePt of pattern) {
        path2.push({ x: pathPt.x + basePt.x, y: pathPt.y + basePt.y });
      }
    } else {
      for (const basePt of pattern) {
        path2.push({ x: pathPt.x - basePt.x, y: pathPt.y - basePt.y });
      }
    }

    tmp.push(path2);
  }

  const result = new Paths64();
  let g = isClosed ? pathLen - 1 : 0;
  let h = patLen - 1;
  for (let i = delta; i < pathLen; i++) {
    for (let j = 0; j < patLen; j++) {
      const quad: Path64 = new Path64([
        tmp[g][h],
        tmp[i][h],
        tmp[i][j],
        tmp[g][j],
      ]);
      if (!Clipper.isPositive(quad)) {
        result.push(Clipper.reversePath(quad));
      } else {
        result.push(quad);
      }
      h = j;
    }
    g = i;
  }

  return result;
};

export const minkowski = {
  sum64: (pattern: Path64, path: Path64, isClosed: boolean): Paths64 => {
    return Clipper.union(
      minkowskiInternal(pattern, path, true, isClosed),
      FillRule.NonZero,
    );
  },
  sumD: (
    pattern: PathD,
    path: PathD,
    isClosed: boolean,
    decimalPlaces: number = 2,
  ): PathsD => {
    const scale = Math.pow(10, decimalPlaces);
    const tmp = Clipper.union(
      minkowskiInternal(
        Clipper.scalePath64(pattern, scale),
        Clipper.scalePath64(path, scale),
        true,
        isClosed,
      ),
      FillRule.NonZero,
    );
    return Clipper.scalePathsD(tmp, 1 / scale);
  },
  diff64: (pattern: Path64, path: Path64, isClosed: boolean): Paths64 => {
    return Clipper.union(
      minkowskiInternal(pattern, path, false, isClosed),
      FillRule.NonZero,
    );
  },
  diffD: (
    pattern: PathD,
    path: PathD,
    isClosed: boolean,
    decimalPlaces: number = 2,
  ): PathsD => {
    const scale = Math.pow(10, decimalPlaces);
    const tmp = Clipper.union(
      minkowskiInternal(
        Clipper.scalePath64(pattern, scale),
        Clipper.scalePath64(path, scale),
        false,
        isClosed,
      ),
      FillRule.NonZero,
    );
    return Clipper.scalePathsD(tmp, 1 / scale);
  },
} as const;
