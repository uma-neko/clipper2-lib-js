import { ClipperBase } from "./ClipperBase";
import { PolyTreeD } from "./PolyTreeD";
import { scalePathD } from "../Clipper";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import { checkPrecision } from "../Core/InternalClipper";
import { Path64Like } from "../Core/Path64Like";
import { Paths64 } from "../Core/Paths64";
import { Paths64Like } from "../Core/Paths64Like";
import { PathsD } from "../Core/PathsD";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";

export class ClipperD extends ClipperBase {
  _scale: number;
  _invScale: number;

  constructor(roundingDecimalPrecision = 2) {
    super();
    checkPrecision(roundingDecimalPrecision);

    this._scale = Math.pow(10, roundingDecimalPrecision);
    this._invScale = 1 / this._scale;
  }

  override addPath(
    path: Iterable<Point64> | Iterable<PointD>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    super.addPath(new Path64Like(path, this._scale), polytype, isOpen);
  }

  override addPaths(
    paths: Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    super.addPaths(new Paths64Like(paths, this._scale), polytype, isOpen);
  }

  override addSubject(
    pathOrPaths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
  ) {
    this.addPaths(new Paths64Like(pathOrPaths, this._scale), PathType.Subject);
  }

  override addOpenSubject(
    pathOrPaths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
  ) {
    this.addPaths(
      new Paths64Like(pathOrPaths, this._scale),
      PathType.Subject,
      true,
    );
  }

  override addClip(
    pathOrPaths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
  ) {
    this.addPaths(new Paths64Like(pathOrPaths, this._scale), PathType.Clip);
  }

  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosed: PathsD,
    solutionOpen: PathsD,
  ): boolean;
  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosed: PathsD,
  ): boolean;
  execute(
    clipType: ClipType,
    fillRule: FillRule,
    polytree: PolyTreeD,
    openPaths: PathsD,
  ): boolean;
  execute(clipType: ClipType, fillRule: FillRule, polytree: PolyTreeD): boolean;

  execute(
    clipType: ClipType,
    fillRule: FillRule,
    solutionClosedOrPolyTree: PathsD | PolyTreeD,
    solutionOpenOrOpenPaths?: PathsD,
  ) {
    solutionOpenOrOpenPaths ??= new PathsD();
    if (solutionClosedOrPolyTree instanceof PolyTreeD) {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths.clear();
      this._using_polytree = true;
      solutionClosedOrPolyTree.scale = this._scale;
      const oPaths: Paths64 = new Paths64();

      // try
      this.executeInternal(clipType, fillRule);
      this.buildTree(solutionClosedOrPolyTree, oPaths);

      this.clearSolutionOnly();

      for (const path of oPaths) {
        solutionOpenOrOpenPaths.push(scalePathD(path, this._invScale));
      }
    } else {
      const solClosed64: Paths64 = new Paths64();
      const solOpen64: Paths64 = new Paths64();

      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths.clear();
      // try
      this.executeInternal(clipType, fillRule);
      this.buildPaths(solClosed64, solOpen64);

      this.clearSolutionOnly();

      for (const path of solClosed64) {
        solutionClosedOrPolyTree.push(scalePathD(path, this._invScale));
      }

      for (const path of solOpen64) {
        solutionOpenOrOpenPaths.push(scalePathD(path, this._invScale));
      }
    }

    return true;
  }
}
