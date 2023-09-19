import { PolyPathBase } from "./PolyPathBase";
import { Path64 } from "../Core/Path64";
import { PathD } from "../Core/PathD";
export declare class PolyPathD extends PolyPathBase {
    scale: number;
    polygon?: PathD;
    constructor(parent?: PolyPathBase);
    addChild(p: Path64): PolyPathBase;
    area(): number;
}
