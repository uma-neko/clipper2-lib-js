import { Path64 } from "../Core/Path64";
import { PathD } from "../Core/PathD";
import { Paths64 } from "../Core/Paths64";
import { PathsD } from "../Core/PathsD";
export declare function sum(pattern: Path64, path: Path64, isClosed: boolean): Paths64;
export declare function sum(pattern: PathD, path: PathD, isClosed: boolean, decimalPlaces?: number): PathsD;
export declare function sum(pattern: Path64 | PathD, path: Path64 | PathD, isClosed: boolean, decimalPlaces?: number): Paths64 | PathsD;
export declare function diff(pattern: Path64, path: Path64, isClosed: boolean): Paths64;
export declare function diff(pattern: PathD, path: PathD, isClosed: boolean, decimalPlaces?: number): PathsD;
export declare function diff(pattern: Path64 | PathD, path: Path64 | PathD, isClosed: boolean, decimalPlaces?: number): Paths64 | PathsD;
export declare const Minkowski: {
    readonly sum: typeof sum;
    readonly diff: typeof diff;
};
