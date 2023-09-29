import { ClipperBase } from "./ClipperBase";
import { PolyTreeD } from "./PolyTreeD";
import { scalePathD } from "../Clipper";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import { checkPrecision } from "../Core/InternalClipper";
import { Paths64 } from "../Core/Paths64";
import { Paths64Like } from "../Core/Paths64Like";
import { PathsD } from "../Core/PathsD";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";
import { isScalablePath } from "../Core/IScalablePath";

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
    this.addPaths(path, polytype, isOpen);
  }

  override addPaths(
    paths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
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
    this.addPaths(pathOrPaths, PathType.Subject);
  }

  override addOpenSubject(
    pathOrPaths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
  ) {
    this.addPaths(pathOrPaths, PathType.Subject, true);
  }

  override addClip(
    pathOrPaths:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
  ) {
    this.addPaths(pathOrPaths, PathType.Clip);
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
    if (solutionClosedOrPolyTree instanceof PolyTreeD) {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();

      this._using_polytree = true;
      solutionClosedOrPolyTree.scale = this._scale;
      const oPaths: Paths64 = new Paths64();

      this.executeInternal(clipType, fillRule);
      this.buildTree(solutionClosedOrPolyTree, oPaths);

      this.clearSolutionOnly();

      if (solutionOpenOrOpenPaths !== undefined) {
        for (const path of oPaths) {
          if (isScalablePath(path)) {
            solutionOpenOrOpenPaths.directPush(
              path.asScaledPathD(this._invScale),
            );
          } else {
            solutionOpenOrOpenPaths.directPush(
              scalePathD(path, this._invScale),
            );
          }
        }
      }
    } else {
      const solClosed64: Paths64 = new Paths64();
      const solOpen64: Paths64 | undefined =
        solutionOpenOrOpenPaths === undefined ? undefined : new Paths64();

      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();

      this.executeInternal(clipType, fillRule);
      this.buildPaths(solClosed64, solOpen64);

      this.clearSolutionOnly();

      for (const path of solClosed64) {
        if (isScalablePath(path)) {
          solutionClosedOrPolyTree.directPush(
            path.asScaledPathD(this._invScale),
          );
        } else {
          solutionClosedOrPolyTree.directPush(scalePathD(path, this._invScale));
        }
      }

      if (solOpen64 !== undefined && solutionOpenOrOpenPaths !== undefined) {
        for (const path of solOpen64) {
          if (isScalablePath(path)) {
            solutionOpenOrOpenPaths.directPush(
              path.asScaledPathD(this._invScale),
            );
          } else {
            solutionOpenOrOpenPaths.directPush(
              scalePathD(path, this._invScale),
            );
          }
        }
      }
    }

    return true;
  }
}
