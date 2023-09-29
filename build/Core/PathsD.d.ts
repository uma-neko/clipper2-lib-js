import { IPathD } from "./IPathD";
import { PointD } from "./PointD";
export declare const isPathsD: (obj: unknown) => obj is PathsD;
export declare const PathsDTypeName = "PathsD";
export declare class PathsD extends Array<IPathD> {
    readonly type: typeof PathsDTypeName;
    constructor();
    constructor(arrayLength: number);
    constructor(...paths: IPathD[]);
    constructor(...args: [] | [number] | IPathD[]);
    static clone(paths: Iterable<Iterable<PointD>>): PathsD;
    clear(): void;
    _push(path: Iterable<PointD>): void;
    directPush(path: IPathD): void;
    push(...paths: Iterable<PointD>[]): number;
    pushRange(paths: Iterable<Iterable<PointD>>): number;
}
