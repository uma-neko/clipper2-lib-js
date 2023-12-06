import { PolyPathBase } from "./PolyPathBase";
import type { IPath64 } from "../Core/IPath64";
import { IPathD } from "../Core/IPathD";
export declare class PolyPathD extends PolyPathBase {
    scale: number;
    polygon?: IPathD;
    constructor(parent?: PolyPathBase);
    addChild(p: IPath64 | IPathD): PolyPathBase;
    area(): number;
}
