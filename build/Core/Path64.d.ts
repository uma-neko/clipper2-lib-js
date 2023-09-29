import { IPath64, Path64TypeName } from "./IPath64";
import { Point64 } from "./Point64";
export declare const isPath64: (obj: unknown) => obj is IPath64;
export declare class Path64 extends Array<Point64> implements IPath64 {
    readonly type: typeof Path64TypeName;
    constructor();
    constructor(arrayLength: number);
    constructor(...paths: Point64[]);
    constructor(...args: [] | [number] | Point64[]);
    clone(): Path64;
    get(index: number): Point64;
    getX(index: number): bigint;
    getY(index: number): bigint;
    getClone(index: number): Point64;
    set(index: number, x: bigint, y: bigint): void;
    push(...path: Point64[]): number;
    pushRange(path: Iterable<Point64>): number;
    clear(): void;
}
