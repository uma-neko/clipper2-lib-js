import type { IPath64 } from "../Core/IPath64";
import { IPathD } from "../Core/IPathD";
import { Paths64 } from "../Core/Paths64";
import { PathsD } from "../Core/PathsD";
export declare function sum(pattern: IPath64, path: IPath64, isClosed: boolean): Paths64;
export declare function sum(pattern: IPathD, path: IPathD, isClosed: boolean, decimalPlaces?: number): PathsD;
export declare function sum(pattern: IPath64 | IPathD, path: IPath64 | IPathD, isClosed: boolean, decimalPlaces?: number): Paths64 | PathsD;
export declare function diff(pattern: IPath64, path: IPath64, isClosed: boolean): Paths64;
export declare function diff(pattern: IPathD, path: IPathD, isClosed: boolean, decimalPlaces?: number): PathsD;
export declare function diff(pattern: IPath64 | IPathD, path: IPath64 | IPathD, isClosed: boolean, decimalPlaces?: number): Paths64 | PathsD;
export declare const Minkowski: {
    readonly sum: typeof sum;
    readonly diff: typeof diff;
};
