import type { IPath64 } from "./IPath64";
import { Point64 } from "./Point64";
export declare const isRect64: (obj: unknown) => obj is Rect64;
export declare const Rect64TypeName: unique symbol;
export declare class Rect64 {
    readonly type: typeof Rect64TypeName;
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
    asPath(): IPath64;
    contains(pt: Point64): boolean;
    contains(rec: Rect64): boolean;
    scale(scale: number): void;
    isEmpty(): boolean;
    isValid(): boolean;
    intersects(rec: Rect64): boolean;
}
export declare const EmptyRect64: Readonly<Rect64>;
