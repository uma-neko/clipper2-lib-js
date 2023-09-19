import { PathD } from "./PathD";
import { PointD } from "./PointD";
export declare class RectD {
    readonly isRectD: true;
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
    asPath(): PathD;
    contains(pt: PointD): boolean;
    contains(rec: RectD): boolean;
    scale(scale: number): void;
    isEmpty(): boolean;
    intersects(rec: RectD): boolean;
}
