import { ClipperBase } from "./ClipperBase";
import { PolyTree64 } from "./PolyTree64";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import { Path64Like } from "../Core/Path64Like";
import { Paths64 } from "../Core/Paths64";
import { Paths64Like } from "../Core/Paths64Like";
import { Point64 } from "../Core/Point64";

export class Clipper64 extends ClipperBase {
  override addPath(
    path: Iterable<Point64>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    super.addPath(new Path64Like(path, 0), polytype, isOpen);
  }

  override addPaths(
    paths: Iterable<Point64> | Iterable<Iterable<Point64>>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    super.addPaths(new Paths64Like(paths, 0), polytype, isOpen);
  }

  override addSubject(
    pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>,
  ) {
    this.addPaths(pathOrPaths, PathType.Subject);
  }

  override addOpenSubject(
    pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>,
  ) {
    this.addPaths(pathOrPaths, PathType.Subject, true);
  }

  override addClip(
    pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>,
  ) {
    this.addPaths(pathOrPaths, PathType.Clip);
  }

  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosed: Paths64,
    solutionOpen: Paths64,
  ): boolean;
  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosed: Paths64,
  ): boolean;
  execute(
    clipType: ClipType,
    fillRule: FillRule,
    polytree: PolyTree64,
    openPaths: Paths64,
  ): boolean;
  execute(
    clipType: ClipType,
    fillRule: FillRule,
    polytree: PolyTree64,
  ): boolean;

  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosedOrPolyTree: Paths64 | PolyTree64,
    solutionOpenOrOpenPaths?: Paths64,
  ) {
    solutionOpenOrOpenPaths ??= new Paths64();
    if (solutionClosedOrPolyTree instanceof PolyTree64) {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths.clear();
      this._using_polytree = true;
      // try
      this.executeInternal(clipType, fillRule);
      this.buildTree(solutionClosedOrPolyTree, solutionOpenOrOpenPaths);
    } else {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths.clear();
      // try
      this.executeInternal(clipType, fillRule);
      this.buildPaths(solutionClosedOrPolyTree, solutionOpenOrOpenPaths);
    }

    this.clearSolutionOnly();
    return this._succeeded;
  }
}
