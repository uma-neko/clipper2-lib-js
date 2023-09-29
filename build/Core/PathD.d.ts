import { PathDTypeName, IPathD } from "./IPathD";
import { PointD } from "./PointD";
export declare const isPathD: (obj: unknown) => obj is IPathD;
export declare class PathD extends Array<PointD> implements IPathD {
    readonly type: typeof PathDTypeName;
    constructor();
    constructor(arrayLength: number);
    constructor(...paths: PointD[]);
    constructor(...args: [] | [number] | PointD[]);
    clone(): PathD;
    get(index: number): PointD;
    getX(index: number): number;
    getY(index: number): number;
    getClone(index: number): PointD;
    set(index: number, x: number, y: number): void;
    push(...path: PointD[]): number;
    pushRange(path: Iterable<PointD>): number;
    clear(): void;
}
