export declare const isNotNullish: (obj: unknown) => obj is Record<string, unknown>;
export declare const bigintAbs: (a: bigint) => bigint;
declare global {
    interface ProxyConstructor {
        new <TTarget extends object, TProxy extends object>(target: TTarget, handler: ProxyHandler<TTarget>): TProxy;
    }
}
