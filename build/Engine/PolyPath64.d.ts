import { PolyPathBase } from "./PolyPathBase";
import { Path64 } from "../Core/Path64";
export declare class PolyPath64 extends PolyPathBase {
    polygon?: Path64;
    addChild(p: Path64): PolyPathBase;
    child(index: number): PolyPath64;
    area(): number;
}
