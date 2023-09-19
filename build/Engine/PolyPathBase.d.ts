import { Path64 } from "../Core/Path64";
export declare class PolyPathBase {
    _parent?: PolyPathBase;
    _childs: PolyPathBase[];
    constructor(parent?: PolyPathBase);
    getLevel(): number;
    getIsHole(): boolean;
    get length(): number;
    clear(): void;
    addChild(_: Path64): PolyPathBase;
    [Symbol.iterator](): Generator<PolyPathBase, void, unknown>;
}
