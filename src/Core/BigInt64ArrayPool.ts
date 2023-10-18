interface childRecord {
  offset: number;
  capacity: number;
  ref: BigInt64Array;
}

const initialSize: number = 128;

export class BigInt64ArrayPool {
  _buffer: BigInt64Array;
  _capacity: number;
  _currentPosition: number;
  _records: Map<symbol, childRecord>;

  constructor() {
    this._capacity = initialSize;
    this._currentPosition = 0;
    this._buffer = new BigInt64Array(initialSize * 2);
    this._records = new Map();
  }

  disposeChild(symbol: symbol) {
    let rec: childRecord | undefined;
    if (
      symbol === undefined ||
      (rec = this._records.get(symbol)) === undefined
    ) {
      throw new Error();
    }
    rec.ref = undefined!;
    this._records.delete(symbol);
  }

  allocChild(needCapacity: number) {
    const symbol = Symbol();

    if (this._capacity < needCapacity + this._currentPosition) {
      this.realloc(needCapacity + this._currentPosition);
    }

    const offset = this._currentPosition;

    const ref = new BigInt64Array(
      this._buffer.buffer,
      offset * 8 * 2,
      needCapacity * 2,
    );

    const rec: childRecord = {
      offset: offset,
      capacity: needCapacity,
      ref: ref,
    };
    this._currentPosition += needCapacity;

    this._records.set(symbol, rec);
    const dispose = this.disposeChild.bind(this, symbol);
    const realloc = this.reallocChild.bind(this, symbol);
    const getRef = () => rec.ref;

    return {
      dispose,
      realloc,
      getRef,
    };
  }

  reallocChild(symbol: symbol, needCapacity: number) {
    let rec: childRecord | undefined;
    if (
      symbol === undefined ||
      (rec = this._records.get(symbol)) === undefined
    ) {
      throw new Error();
    }

    rec.capacity = needCapacity;
    if (this._capacity < needCapacity + this._currentPosition) {
      this.realloc(needCapacity + this._currentPosition);
    } else {
      const oldRef = rec.ref;
      rec.ref = new BigInt64Array(
        this._buffer.buffer,
        this._currentPosition * 8 * 2,
        needCapacity * 2,
      );
      rec.ref.set(oldRef);
      this._currentPosition += needCapacity;
    }
    return;
  }

  realloc(needCapacity: number) {
    const shiftNum = Math.ceil(
      Math.log2((1.0 * needCapacity) / this._capacity),
    );
    const newCapacity = this._capacity << shiftNum;
    this._capacity = newCapacity;
    const newBuffer = new BigInt64Array(newCapacity * 2);

    let currentPosition = 0;

    for (const rec of this._records.values()) {
      const capa = rec.capacity;
      const oldRef = rec.ref;
      rec.ref = new BigInt64Array(
        newBuffer.buffer,
        currentPosition * 8 * 2,
        capa * 2,
      );
      rec.ref.set(oldRef);
      currentPosition += capa;
    }
    this._currentPosition = currentPosition;

    this._buffer = newBuffer;
  }
}
