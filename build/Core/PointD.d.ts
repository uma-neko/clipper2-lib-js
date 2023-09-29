export type PointD = {
    x: number;
    y: number;
};
export declare const isPointD: (obj: unknown) => obj is PointD;
export declare const PointD: {
    equals: (a: PointD, b: PointD) => boolean;
    notEquals: (a: PointD, b: PointD) => boolean;
    clone: (origin: PointD) => PointD;
    toString(pt: PointD, precision?: number): string;
};
