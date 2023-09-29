import { PolyPathBase } from "./PolyPathBase";
import { IPath64 } from "../Core/IPath64";
export declare class PolyPath64 extends PolyPathBase {
    polygon?: IPath64;
    addChild(p: IPath64): PolyPathBase;
    child(index: number): PolyPath64;
    area(): number;
}
