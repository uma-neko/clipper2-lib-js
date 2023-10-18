export const isNotNullish = (obj: unknown): obj is Record<string, unknown> =>
  obj !== undefined && obj !== null && typeof obj === "object";

export const bigintAbs = (a: bigint) => (a >= 0n ? a : -a);

export const isLittleEndian =
  new DataView(new Int16Array([1]).buffer).getInt8(0) === 1;

const bigintBuffer = new ArrayBuffer(8);
const bigintCache = new BigInt64Array(bigintBuffer);
const bigintView = new DataView(bigintBuffer);

export const longToDouble = (val: bigint) => {
  if (val < 0n) {
    bigintCache[0] = -val;
    if (isLittleEndian) {
      return -(
        bigintView.getUint32(0, true) +
        bigintView.getUint32(4, true) * 0x100000000
      );
    } else {
      return -(
        bigintView.getUint32(4, false) +
        bigintView.getUint32(0, false) * 0x100000000
      );
    }
  } else {
    bigintCache[0] = val;
    if (isLittleEndian) {
      return (
        bigintView.getUint32(0, true) +
        bigintView.getUint32(4, true) * 0x100000000
      );
    } else {
      return (
        bigintView.getUint32(4, false) +
        bigintView.getUint32(0, false) * 0x100000000
      );
    }
  }
};

declare global {
  interface ProxyConstructor {
    new <TTarget extends object, TProxy extends object>(
      target: TTarget,
      handler: ProxyHandler<TTarget>,
    ): TProxy;
  }
}
