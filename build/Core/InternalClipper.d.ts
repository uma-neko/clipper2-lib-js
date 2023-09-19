import { Path64 } from "./Path64";
import { Point64 } from "./Point64";
import { PointD } from "./PointD";
import { PointInPolygonResult } from "../Engine/EngineEnums";
export declare const defaultArcTolerance = 0.25;
export declare const checkPrecision: (precision: number) => void;
export declare const isAlmostZero: (value: number) => boolean;
export declare function crossProduct(pt1: Point64, pt2: Point64, pt3: Point64): number;
export declare function crossProduct(vec1: PointD, vec2: PointD): number;
export declare function dotProduct(vec1: PointD, vec2: PointD): number;
export declare function dotProduct(pt1: Point64, pt2: Point64, pt3: Point64): number;
export declare const getIntersectPt: (ln1a: Point64, ln1b: Point64, ln2a: Point64, ln2b: Point64) => Point64 | undefined;
export declare const getIntersectPoint: (ln1a: Point64, ln1b: Point64, ln2a: Point64, ln2b: Point64) => {
    result: boolean;
    ip: Point64;
};
export declare const segsIntersect: (seg1a: Point64, seg1b: Point64, seg2a: Point64, seg2b: Point64, inclusive?: boolean) => boolean;
export declare const getClosestPtOnSegment: (offPt: Point64, seg1: Point64, seg2: Point64) => Point64;
export declare const pointInPolygon: (pt: Point64, polygon: Path64) => PointInPolygonResult;
export declare const InternalClipper: {
    readonly getClosestPtOnSegment: (offPt: Point64, seg1: Point64, seg2: Point64) => Point64;
    readonly pointInPolygon: (pt: Point64, polygon: Path64) => PointInPolygonResult;
};
