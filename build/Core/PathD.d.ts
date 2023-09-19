import { PointD } from "./PointD";
export declare const isPathD: (obj: unknown) => obj is PathD;
export declare const PathDTypeName = "PathD";
export declare class PathD extends Array<PointD> {
    readonly type: typeof PathDTypeName;
    constructor(path?: Iterable<PointD>);
    clear(): void;
}
