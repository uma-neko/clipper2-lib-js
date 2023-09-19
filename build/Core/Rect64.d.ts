import { Path64 } from "./Path64";
import { Point64 } from "./Point64";
export declare class Rect64 {
    readonly isRect64: true;
    left: bigint;
    top: bigint;
    right: bigint;
    bottom: bigint;
    constructor();
    constructor(l: bigint, t: bigint, r: bigint, b: bigint);
    constructor(isValid: boolean);
    constructor(rec: Rect64);
    get width(): bigint;
    set width(value: bigint);
    get height(): bigint;
    set height(value: bigint);
    midPoint(): Point64;
    asPath(): Path64;
    contains(pt: Point64): boolean;
    contains(rec: Rect64): boolean;
    scale(scale: number): void;
    isEmpty(): boolean;
    intersects(rec: Rect64): boolean;
}
