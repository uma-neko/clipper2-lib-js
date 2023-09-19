import { ClipperBase } from "./ClipperBase";
import { PolyTreeD } from "./PolyTreeD";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import { PathsD } from "../Core/PathsD";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";
export declare class ClipperD extends ClipperBase {
    _scale: number;
    _invScale: number;
    constructor(roundingDecimalPrecision?: number);
    addPath(path: Iterable<Point64> | Iterable<PointD>, polytype: PathType, isOpen?: boolean): void;
    addPaths(paths: Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>, polytype: PathType, isOpen?: boolean): void;
    addSubject(pathOrPaths: Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>): void;
    addOpenSubject(pathOrPaths: Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>): void;
    addClip(pathOrPaths: Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>): void;
    execute(clipType: ClipType, fillRule: FillRule, solutionClosed: PathsD, solutionOpen: PathsD): boolean;
    execute(clipType: ClipType, fillRule: FillRule, solutionClosed: PathsD): boolean;
    execute(clipType: ClipType, fillRule: FillRule, polytree: PolyTreeD, openPaths: PathsD): boolean;
    execute(clipType: ClipType, fillRule: FillRule, polytree: PolyTreeD): boolean;
}
