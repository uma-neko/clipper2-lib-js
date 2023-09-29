import { ClipperBase } from "./ClipperBase";
import { PolyTree64 } from "./PolyTree64";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
export declare class Clipper64 extends ClipperBase {
    addPath(path: Iterable<Point64>, polytype: PathType, isOpen?: boolean): void;
    addPaths(paths: Iterable<Point64> | Iterable<Iterable<Point64>>, polytype: PathType, isOpen?: boolean): void;
    addSubject(pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>): void;
    addOpenSubject(pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>): void;
    addClip(pathOrPaths: Iterable<Point64> | Iterable<Iterable<Point64>>): void;
    execute(clipType: ClipType, fillRule: FillRule, solutionClosed: Paths64, solutionOpen: Paths64): boolean;
    execute(clipType: ClipType, fillRule: FillRule, solutionClosed: Paths64): boolean;
    execute(clipType: ClipType, fillRule: FillRule, polytree: PolyTree64, openPaths: Paths64): boolean;
    execute(clipType: ClipType, fillRule: FillRule, polytree: PolyTree64): boolean;
}
