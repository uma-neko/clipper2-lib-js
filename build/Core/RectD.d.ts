import { IPathD } from "./IPathD";
import { PointD } from "./PointD";
export declare const isRectD: (obj: unknown) => obj is RectD;
export declare const RectDTypeName: unique symbol;
export declare class RectD {
    readonly type: typeof RectDTypeName;
    left: number;
    top: number;
    right: number;
    bottom: number;
    constructor();
    constructor(l: number, t: number, r: number, b: number);
    constructor(isValid: boolean);
    constructor(rec: RectD);
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
    midPoint(): PointD;
    asPath(): IPathD;
    contains(pt: PointD): boolean;
    contains(rec: RectD): boolean;
    scale(scale: number): void;
    isEmpty(): boolean;
    intersects(rec: RectD): boolean;
}
