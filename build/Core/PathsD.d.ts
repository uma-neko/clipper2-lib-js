import { PathD } from "./PathD";
import { PointD } from "./PointD";
export declare const isPathsD: (obj: unknown) => obj is PathsD;
export declare const PathsDTypeName = "PathsD";
export declare class PathsD extends Array<PathD> {
    readonly type: typeof PathsDTypeName;
    constructor(paths?: Iterable<Iterable<PointD>>);
    clear(): void;
    push(...paths: Iterable<PointD>[]): number;
}
