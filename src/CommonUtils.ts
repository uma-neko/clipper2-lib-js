export const isNotNullish = (obj: unknown): obj is Record<string, unknown> =>
  obj !== undefined && obj !== null && typeof obj === "object";

export const bigintAbs = (a: bigint) => (a >= 0n ? a : -a);

export const isLittleEndian =
  new DataView(new Int16Array([1]).buffer).getInt8(0) === 1;

const bigintBuffer = new ArrayBuffer(8);
const bigintCache = new BigInt64Array(bigintBuffer);
const bigintView = new DataView(bigintBuffer);

const numberBuffer = new ArrayBuffer(8);
const numberCache = new Float64Array(numberBuffer);
const numberView = new DataView(numberCache.buffer);

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

export const doubleToLong = (val: number) => {
  if (val === 0) {
    return 0n;
  }

  bigintCache[0] = 0n;
  numberCache[0] = val;

  if (isLittleEndian) {
    const exponent = ((numberView.getUint16(6, true) & 0x7ff0) >>> 4) - 1023;
    if (exponent > 63) {
      throw new RangeError("Invalid value range.");
    }
    const rshift = 7 - ((exponent + 3) % 8);

    let numberBlock = 6;
    let byte = (numberView.getUint8(numberBlock--) & 0x0f) | 0x10;

    if (rshift > 4) {
      byte = (byte << 8) | numberView.getUint8(numberBlock--);
    }

    let i = exponent >> 3;
    do {
      bigintView.setUint8(i--, (byte >> rshift) & 0xff);
    } while (
      i >= 0 &&
      ((byte = ((byte << 8) | numberView.getUint8(numberBlock--)) & 0xffff) ||
        true)
    );
    if ((numberView.getUint8(7) & 0x80) === 0x80) {
      return -bigintCache[0];
    } else {
      return bigintCache[0];
    }
  } else {
    const exponent = ((numberView.getUint16(1, false) & 0x7ff0) >>> 4) - 1023;
    if (exponent > 63) {
      throw new RangeError("Invalid value range.");
    }
    const rshift = 7 - ((exponent + 3) % 8);

    let numberBlock = 1;
    let byte = (numberView.getUint8(numberBlock++) & 0x0f) | 0x10;

    if (rshift > 4) {
      byte = (byte << 8) | numberView.getUint8(numberBlock++);
    }

    let i = 7 - (exponent >> 3);
    do {
      bigintView.setUint8(i++, (byte >> rshift) & 0xff);
    } while (
      i <= 7 &&
      ((byte = ((byte << 8) | numberView.getUint8(numberBlock++)) & 0xffff) ||
        true)
    );
    if ((numberView.getUint8(0) & 0x80) === 0x80) {
      return -bigintCache[0];
    } else {
      return bigintCache[0];
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
