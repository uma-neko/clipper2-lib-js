import { HorzSegment } from "./HorzSegment";
import { OutRec } from "./OutRec";
import { Point64 } from "../Core/Point64";

export type OutPt = {
  pt: Point64;
  next?: OutPt;
  prev: OutPt;
  outrec: OutRec;
  horz?: HorzSegment;
};
