export type Point64 = {
    x: bigint;
    y: bigint;
};
export declare const isPoint64: (obj: unknown) => obj is Point64;
export declare const Point64: {
    readonly equals: (a: Point64, b: Point64) => boolean;
    readonly notEquals: (a: Point64, b: Point64) => boolean;
    readonly clone: (origin: Point64) => Point64;
    readonly createScaledPoint: (x: number, y: number, scale: number) => Point64;
    readonly toString: (pt: Point64) => string;
};
