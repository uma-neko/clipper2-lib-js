import { type IPath64 } from "./IPath64";
import { Point64 } from "./Point64";
export declare const isPaths64: (obj: unknown) => obj is Paths64;
export declare const Paths64TypeName = "Paths64";
export declare class Paths64 extends Array<IPath64> {
    readonly type: typeof Paths64TypeName;
    constructor();
    constructor(arrayLength: number);
    constructor(...paths: IPath64[]);
    constructor(...args: [] | [number] | IPath64[]);
    static clone(paths: Iterable<Iterable<Point64>>): Paths64;
    clear(): void;
    _push(path: Iterable<Point64>): void;
    directPush(path: IPath64): void;
    push(...paths: Iterable<Point64>[]): number;
    pushRange(paths: Iterable<Iterable<Point64>>): number;
}
