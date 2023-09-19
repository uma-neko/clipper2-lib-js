import { Path64 } from "./Path64";
import { Point64 } from "./Point64";
export declare const isPaths64: (obj: unknown) => obj is Paths64;
export declare const Paths64TypeName = "Paths64";
export declare class Paths64 extends Array<Path64> {
    readonly type: typeof Paths64TypeName;
    constructor(paths?: Iterable<Iterable<Point64>>);
    clear(): void;
    push(...paths: Iterable<Point64>[]): number;
}
