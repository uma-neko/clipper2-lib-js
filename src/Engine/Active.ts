import { JoinWith } from "./EngineEnums";
import { OutRec } from "./OutRec";
import { Vertex } from "./Vertex";
import { Point64 } from "../Core/Point64";
import { PathType } from "../Core/CoreEnums";

export type Active = {
  bot: Point64;
  top: Point64;
  curX: bigint;
  dx: number;
  windDx: number;
  windCount: number;
  windCount2: number;
  outrec?: OutRec;

  prevInAEL?: Active;
  nextInAEL?: Active;

  prevInSEL?: Active;
  nextInSEL?: Active;
  jump?: Active;
  vertexTop?: Vertex;
  localMinVertex: Vertex;
  localMinPolytype: PathType;
  localMinIsOpen: boolean;
  isLeftBound: boolean;
  joinWith: JoinWith;
};
