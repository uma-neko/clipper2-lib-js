import { OutPt2 } from "./OutPt2";
import { Path64 } from "../Core/Path64";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { Rect64 } from "../Core/Rect64";
export declare const Location: {
    readonly left: 0;
    readonly top: 1;
    readonly right: 2;
    readonly bottom: 3;
    readonly inside: 4;
};
export type Location = (typeof Location)[keyof typeof Location];
export declare const getLocation: (rec: Rect64, pt: Point64) => {
    result: boolean;
    loc: Location;
};
export declare class RectClip64 {
    _rect: Rect64;
    _mp: Point64;
    _rectPath: Path64;
    _pathBounds: Rect64;
    _results: (OutPt2 | undefined)[];
    _edges: (OutPt2 | undefined)[][];
    _currIdx: number;
    constructor(rect: Rect64);
    add(pt: Point64, startingNewPath?: boolean): OutPt2 | undefined;
    addCorner(prev: Location, curr: Location): void;
    addCornerRef(loc: Location, isClockwise: boolean): Location;
    getIntersection(rectPath: Path64, p: Point64, p2: Point64, loc: Location): {
        result: boolean;
        loc: Location;
        ip: Point64;
    };
    getNextLocation(path: Path64, loc: Location, i: number, highI: number): {
        loc: Location;
        i: number;
    };
    executeInternal(path: Path64): void;
    execute(paths: Paths64): Paths64;
    checkEdges(): void;
    tidyEdgePair(idx: number, cw: (OutPt2 | undefined)[], ccw: (OutPt2 | undefined)[]): void;
    getPath(op: OutPt2 | undefined): Path64;
}
