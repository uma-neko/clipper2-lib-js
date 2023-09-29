import { Point64 } from "./Point64";
export declare const Path64TypeName: unique symbol;
export interface IPath64 extends Iterable<Point64> {
    readonly type: typeof Path64TypeName;
    push(...path: Point64[]): number;
    pushRange(path: Iterable<Point64>): number;
    clear(): void;
    clone(): IPath64;
    pop(): Point64 | undefined;
    getClone(index: number): Point64;
    get(index: number): Point64;
    getX(index: number): bigint;
    getY(index: number): bigint;
    set(index: number, x: bigint, y: bigint): void;
    readonly length: number;
}
