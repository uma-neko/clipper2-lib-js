import { Path64 } from "../Core/Path64";
import { Rect64 } from "../Core/Rect64";
import { Active } from "./Active";
import { OutPt } from "./OutPt";
import { PolyPathBase } from "./PolyPathBase";

export type OutRec = {
  idx: number;
  owner?: OutRec;
  frontEdge?: Active;
  backEdge?: Active;
  pts?: OutPt;
  polypath?: PolyPathBase;
  bounds: Rect64;
  path: Path64;
  isOpen: boolean;
  splits?: number[];
  recursiveSplit?: OutRec;
};
