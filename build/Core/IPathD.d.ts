import { PointD } from "./PointD";
export declare const PathDTypeName: unique symbol;
export interface IPathD extends Iterable<PointD> {
    readonly type: typeof PathDTypeName;
    push(...path: PointD[]): number;
    pushRange(path: Iterable<PointD>): number;
    clear(): void;
    clone(): IPathD;
    pop(): PointD | undefined;
    getClone(index: number): PointD;
    get(index: number): PointD;
    getX(index: number): number;
    getY(index: number): number;
    set(index: number, x: number, y: number): void;
    readonly length: number;
}
