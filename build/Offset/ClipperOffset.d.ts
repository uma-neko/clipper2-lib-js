import { ClipperGroup } from "./ClipperGroup";
import { EndType, JoinType } from "./OffsetEnums";
import { IPathD } from "../Core/IPathD";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { PointD } from "../Core/PointD";
import { Rect64 } from "../Core/Rect64";
import { PolyTree64 } from "../Engine/PolyTree64";
import type { IPath64 } from "../Core/IPath64";
export type DeltaCallback64 = (path: IPath64, path_norms: IPathD, currPt: number, prevPt: number) => number;
export declare class ClipperOffset {
    _groupList: ClipperGroup[];
    _inPath: IPath64;
    _pathOut: IPath64;
    _normals: IPathD;
    _solution: Paths64;
    _groupDelta: number;
    _delta: number;
    _mitLimSqr: number;
    _stepsPerRad: number;
    _stepSin: number;
    _stepCos: number;
    _joinType: JoinType;
    _endType: EndType;
    arcTolerance: number;
    mergeGroups: boolean;
    miterLimit: number;
    preserveCollinear: boolean;
    reverseSolution: boolean;
    deltaCallback?: DeltaCallback64;
    constructor(miterLimit?: number, arcTolerance?: number, preserveCollinear?: boolean, reverseSolution?: boolean);
    clear(): void;
    addPath(path: IPath64, joinType: JoinType, endType: EndType): void;
    addPaths(paths: Paths64, joinType: JoinType, endType: EndType): void;
    executeInternal(delta: number): void;
    checkPathReversed(): boolean;
    execute(deltaOrDeltaCallback: number | DeltaCallback64, solutionOrPolyTree: Paths64 | PolyTree64): void;
    getUnitNormal(pt1: Point64, pt2: Point64): PointD;
    validateBounds(boundsList: Rect64[], delta: number): boolean;
    translatePoint(pt: PointD, dx: number, dy: number): PointD;
    reflectPoint(pt: PointD, pivot: PointD): PointD;
    almostZero(value: number, epsilon?: number): boolean;
    hypotenuse(x: number, y: number): number;
    normalizeVector(vec: PointD): PointD;
    getAvgUnitVector(vec1: PointD, vec2: PointD): PointD;
    intersectPoint(pt1a: PointD, pt1b: PointD, pt2a: PointD, pt2b: PointD): PointD;
    getPerpendic(pt: Point64, norm: PointD): Point64;
    getPerpendicD(pt: Point64, norm: PointD): PointD;
    doBevel(path: IPath64, j: number, k: number): void;
    doSquare(path: IPath64, j: number, k: number): void;
    doMiter(path: IPath64, j: number, k: number, cosA: number): void;
    doRound(path: IPath64, j: number, k: number, angle: number): void;
    bulidNormals(path: IPath64): void;
    offsetPoint(group: ClipperGroup, path: IPath64, j: number, k: number): number;
    offsetPolygon(group: ClipperGroup, path: IPath64): void;
    offsetOpenJoined(group: ClipperGroup, path: IPath64): void;
    offsetOpenPath(group: ClipperGroup, path: IPath64): void;
    doGroupOffset(group: ClipperGroup): void;
}
