import { ClipType, FillRule } from "./Core/CoreEnums";
import type { IPath64 } from "./Core/IPath64";
import { IPathD } from "./Core/IPathD";
import { Paths64 } from "./Core/Paths64";
import { PathsD } from "./Core/PathsD";
import { Point64 } from "./Core/Point64";
import { PointD } from "./Core/PointD";
import { Rect64 } from "./Core/Rect64";
import { RectD } from "./Core/RectD";
import { PointInPolygonResult } from "./Engine/EngineEnums";
import { PolyPath64 } from "./Engine/PolyPath64";
import { PolyPathBase } from "./Engine/PolyPathBase";
import { PolyPathD } from "./Engine/PolyPathD";
import { PolyTree64 } from "./Engine/PolyTree64";
import { PolyTreeD } from "./Engine/PolyTreeD";
import { EndType, JoinType } from "./Offset/OffsetEnums";
export declare const roundToEven: (num: number) => number;
export declare const awayFromZeroRounding: (num: number) => number;
export declare function numberToBigInt(num: number): bigint;
export declare function perpendicDistFromLineSqrd(pt: Point64, line1: Point64, line2: Point64): number;
export declare function perpendicDistFromLineSqrd(pt: PointD, line1: PointD, line2: PointD): number;
export declare function perpendicDistFromLineSqrd64(pt: Point64, line1: Point64, line2: Point64): number;
export declare function perpendicDistFromLineSqrdD(pt: PointD, line1: PointD, line2: PointD): number;
export declare function sqr(value: number): number;
export declare function rdp(path: IPath64 | IPathD, begin: number, end: number, epsSqrd: number, flags: boolean[]): void;
export declare const invalidRect64: () => Rect64;
export declare const invalidRectD: () => RectD;
export declare function intersect(subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
export declare function intersect(subject: PathsD, clip: PathsD, fillRule: FillRule, precision?: number): PathsD;
export declare function union(subject: Paths64, fillRule: FillRule): Paths64;
export declare function union(subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
export declare function union(subject: PathsD, fillRule: FillRule): PathsD;
export declare function union(subject: PathsD, clip: PathsD, fillRule: FillRule, precision?: number): PathsD;
export declare function difference(subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
export declare function difference(subject: PathsD, clip: PathsD, fillRule: FillRule, precision?: number): PathsD;
export declare function xor(subject: Paths64, clip: Paths64, fillRule: FillRule): Paths64;
export declare function xor(subject: PathsD, clip: PathsD, fillRule: FillRule, precision?: number): PathsD;
export declare function booleanOp(clipType: ClipType, subject: Paths64, clip: Paths64 | undefined, fillRule: FillRule): Paths64;
export declare function booleanOp(clipType: ClipType, subject: Paths64, clip: Paths64 | undefined, polytree: PolyTree64, fillRule: FillRule): void;
export declare function booleanOp(clipType: ClipType, subject: PathsD, clip: PathsD | undefined, fillRule: FillRule, precision?: number): PathsD;
export declare function booleanOp(clipType: ClipType, subject: PathsD, clip: PathsD | undefined, polytree: PolyTreeD, fillRule: FillRule, precision?: number): void;
export declare function booleanOp(clipType: ClipType, subject: Paths64 | PathsD, clip: Paths64 | PathsD | undefined, fillRuleOrPolyTree: FillRule | PolyTree64 | PolyTreeD, precisionOrFillRule?: number | FillRule, precision?: number): Paths64 | PathsD | void;
export declare function inflatePaths(paths: Paths64, delta: number, joinType: JoinType, endType: EndType, miterLimit?: number, arcTolerance?: number): Paths64;
export declare function inflatePaths(paths: PathsD, delta: number, joinType: JoinType, endType: EndType, miterLimit?: number, precision?: number, arcTolerance?: number): PathsD;
export declare function rectClip(rect: Rect64, pathOrpaths: IPath64 | Paths64): Paths64;
export declare function rectClip(rect: RectD, pathOrPaths: IPathD | PathsD, precision?: number): PathsD;
export declare function rectClipLines(rect: Rect64, paths: Paths64): Paths64;
export declare function rectClipLines(rect: Rect64, path: IPath64): Paths64;
export declare function rectClipLines(rect: RectD, paths: PathsD, precision?: number): PathsD;
export declare function rectClipLines(rect: RectD, path: IPathD, precision?: number): PathsD;
export declare function minkowskiSum(pattern: IPath64 | IPathD, path: IPath64 | IPathD, isClosed: boolean): Paths64 | PathsD;
export declare function minkowskiDiff(pattern: IPath64 | IPathD, path: IPath64 | IPathD, isClosed: boolean): Paths64 | PathsD;
export declare function area(pathOrPaths: IPath64 | IPathD | Paths64 | PathsD): number;
export declare function isPositive(path: IPath64 | IPathD): boolean;
export declare function path64ToString(path: IPath64): string;
export declare function paths64ToString(paths: Paths64): string;
export declare function pathDToString(path: IPathD): string;
export declare function pathsDToString(paths: PathsD): string;
export declare function offsetPath(path: IPath64, dx: bigint, dy: bigint): IPath64;
export declare function scalePoint64(pt: Point64, scale: number): Point64;
export declare function scalePointD(pt: Point64, scale: number): PointD;
export declare function scaleRect(rec: RectD, scale: number): Rect64;
export declare function scalePath(path: IPath64, scale: number): IPath64;
export declare function scalePath(path: IPathD, scale: number): IPathD;
export declare function scalePaths(paths: Paths64, scale: number): Paths64;
export declare function scalePaths(paths: PathsD, scale: number): PathsD;
export declare function scalePath64(path: IPathD, scale: number): IPath64;
export declare function scalePathD(path: IPath64, scale: number): IPathD;
export declare function scalePaths64(paths: PathsD, scale: number): Paths64;
export declare function scalePathsD(paths: Paths64, scale: number): PathsD;
export declare function path64(path: IPathD): IPath64;
export declare function paths64(paths: PathsD): Paths64;
export declare function pathD(path: IPath64): IPathD;
export declare function pathsD(paths: Paths64): PathsD;
export declare function translatePath(path: IPath64, dx: bigint, dy: bigint): IPath64;
export declare function translatePath(path: IPathD, dx: number, dy: number): IPathD;
export declare function translatePaths(paths: Paths64, dx: bigint, dy: bigint): Paths64;
export declare function translatePaths(paths: PathsD, dx: number, dy: number): PathsD;
export declare function reversePath(path: IPath64): IPath64;
export declare function reversePath(path: IPathD): IPathD;
export declare function reversePaths(paths: Paths64): Paths64;
export declare function reversePaths(paths: PathsD): PathsD;
export declare function getBounds(path: IPath64): Rect64;
export declare function getBounds(paths: Paths64): Rect64;
export declare function getBounds(path: IPathD): RectD;
export declare function getBounds(paths: PathsD): RectD;
export declare function makePath64(arr: ArrayLike<number>): IPath64;
export declare function makePath64(arr: ArrayLike<bigint>): IPath64;
export declare function makePathD(arr: ArrayLike<number>): IPathD;
export declare function pointsNearEqual(pt1: PointD, pt2: PointD, distanceSqrd: number): boolean;
export declare function stripNearDuplicates(path: IPathD, minEdgeLenSqrd: number, isClosedPath: boolean): IPathD;
export declare function stripDuplicates(path: IPath64, isClosedPath: boolean): IPath64;
export declare function addPolyNodeToPaths(polyPath: PolyPath64, paths: Paths64): void;
export declare function polyTreeToPaths64(polyTree: PolyTree64): Paths64;
export declare function addPolyNodeToPathsD(polyPath: PolyPathD, paths: PathsD): void;
export declare function polyTreeToPathsD(polyTree: PolyTreeD): PathsD;
export declare function ramerDouglasPeucker(path: IPath64, epsilon: number): IPath64;
export declare function ramerDouglasPeucker(path: Paths64, epsilon: number): Paths64;
export declare function ramerDouglasPeucker(path: IPathD, epsilon: number): IPathD;
export declare function ramerDouglasPeucker(path: PathsD, epsilon: number): PathsD;
export declare function getNext(current: number, high: number, flags: boolean[]): number;
export declare function getPrior(current: number, high: number, flags: boolean[]): number;
export declare function simplifyPath64(path: IPath64, epsilon: number, isClosedPath?: boolean): IPath64;
export declare function simplifyPathD(path: IPathD, epsilon: number, isClosedPath?: boolean): IPathD;
export declare function simplifyPath(path: IPath64, epsilon: number, isClosedPath?: boolean): IPath64;
export declare function simplifyPath(path: IPathD, epsilon: number, isClosedPath?: boolean): IPathD;
export declare function simplifyPaths(paths: Paths64, epsilon: number, isClosedPaths?: boolean): Paths64;
export declare function simplifyPaths(paths: PathsD, epsilon: number, isClosedPaths?: boolean): PathsD;
export declare function trimCollinear(path: IPath64, isOpen?: boolean): IPath64;
export declare function trimCollinear(path: IPathD, precision: number, isOpen?: boolean): IPathD;
export declare function pointInPolygon(pt: Point64, polygon: IPath64): PointInPolygonResult;
export declare function pointInPolygon(pt: PointD, polygon: IPathD, precision?: number): PointInPolygonResult;
export declare function ellipse(center: Point64, radiusX: number, radiusY?: number, steps?: number): IPath64;
export declare function ellipse(center: PointD, radiusX: number, radiusY?: number, steps?: number): IPathD;
export declare function showPolyPathStructure(pp: PolyPathBase, level: number): void;
export declare function showPolyTreeStructure(polytree: PolyTree64 | PolyTreeD): void;
export declare const Clipper: {
    readonly invalidRect64: () => Rect64;
    readonly invalidRectD: () => RectD;
    readonly intersect: typeof intersect;
    readonly union: typeof union;
    readonly difference: typeof difference;
    readonly xor: typeof xor;
    readonly booleanOp: typeof booleanOp;
    readonly inflatePaths: typeof inflatePaths;
    readonly rectClip: typeof rectClip;
    readonly rectClipLines: typeof rectClipLines;
    readonly minkowskiSum: typeof minkowskiSum;
    readonly minkowskiDiff: typeof minkowskiDiff;
    readonly area: typeof area;
    readonly isPositive: typeof isPositive;
    readonly path64ToString: typeof path64ToString;
    readonly paths64ToString: typeof paths64ToString;
    readonly pathDToString: typeof pathDToString;
    readonly pathsDToString: typeof pathsDToString;
    readonly offsetPath: typeof offsetPath;
    readonly scalePoint64: typeof scalePoint64;
    readonly scalePointD: typeof scalePointD;
    readonly scaleRect: typeof scaleRect;
    readonly scalePath: typeof scalePath;
    readonly scalePaths: typeof scalePaths;
    readonly scalePath64: typeof scalePath64;
    readonly scalePaths64: typeof scalePaths64;
    readonly scalePathD: typeof scalePathD;
    readonly scalePathsD: typeof scalePathsD;
    readonly path64: typeof path64;
    readonly paths64: typeof paths64;
    readonly pathsD: typeof pathsD;
    readonly pathD: typeof pathD;
    readonly translatePath: typeof translatePath;
    readonly translatePaths: typeof translatePaths;
    readonly reversePath: typeof reversePath;
    readonly reversePaths: typeof reversePaths;
    readonly getBounds: typeof getBounds;
    readonly makePath64: typeof makePath64;
    readonly makePathD: typeof makePathD;
    readonly sqr: typeof sqr;
    readonly pointsNearEqual: typeof pointsNearEqual;
    readonly stripNearDuplicates: typeof stripNearDuplicates;
    readonly stripDuplicates: typeof stripDuplicates;
    readonly addPolyNodeToPaths: typeof addPolyNodeToPaths;
    readonly polyTreeToPaths64: typeof polyTreeToPaths64;
    readonly addPolyNodeToPathsD: typeof addPolyNodeToPathsD;
    readonly polyTreeToPathsD: typeof polyTreeToPathsD;
    readonly perpendicDistFromLineSqrd: typeof perpendicDistFromLineSqrd;
    readonly ramerDouglasPeucker: typeof ramerDouglasPeucker;
    readonly simplifyPath: typeof simplifyPath;
    readonly simplifyPaths: typeof simplifyPaths;
    readonly trimCollinear: typeof trimCollinear;
    readonly pointInPolygon: typeof pointInPolygon;
    readonly ellipse: typeof ellipse;
    readonly showPolyTreeStructure: typeof showPolyTreeStructure;
};
