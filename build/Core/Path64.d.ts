import { Point64 } from "./Point64";
export declare const isPath64: (obj: unknown) => obj is Path64;
export declare const Path64TypeName = "Path64";
export declare class Path64 extends Array<Point64> {
    readonly type: typeof Path64TypeName;
    constructor(path?: Iterable<Point64>);
    clear(): void;
}
