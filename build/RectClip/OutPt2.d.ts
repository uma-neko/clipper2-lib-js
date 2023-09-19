import { Point64 } from "../Core/Point64";
export type OutPt2 = {
    next?: OutPt2;
    prev?: OutPt2;
    pt: Point64;
    ownerIdx: number;
    edge?: (OutPt2 | undefined)[];
};
