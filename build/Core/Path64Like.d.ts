import { Point64 } from "./Point64";
import { PointD } from "./PointD";
export declare class Path64Like implements Iterable<Point64> {
    _wrapedObject: Iterable<Point64> | Iterable<PointD>;
    _scale: number;
    constructor(wrapedObject: Iterable<Point64> | Iterable<PointD>, scale: number);
    [Symbol.iterator](): Generator<Point64, void, unknown>;
}
