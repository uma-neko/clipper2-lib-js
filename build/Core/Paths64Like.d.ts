import { Point64 } from "./Point64";
import { PointD } from "./PointD";
export declare class Paths64Like implements Iterable<Iterable<Point64>> {
    _wrapedObject: Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>;
    _scale: number;
    constructor(wrapedObject: Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>, scale: number);
    get length(): Iterable<Point64> | Iterable<PointD> | Iterable<Iterable<Point64>> | Iterable<Iterable<PointD>>;
    [Symbol.iterator](): Generator<Iterable<Point64>, void, unknown>;
}
