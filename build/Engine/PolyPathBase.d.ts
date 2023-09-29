import type { IPath64 } from "../Core/IPath64";
export declare class PolyPathBase {
    _parent?: PolyPathBase;
    _childs: PolyPathBase[];
    constructor(parent?: PolyPathBase);
    getLevel(): number;
    getIsHole(): boolean;
    get length(): number;
    clear(): void;
    addChild(_: IPath64): PolyPathBase;
    [Symbol.iterator](): Generator<PolyPathBase, void, unknown>;
}
