export class FullMath {
  static fullMul(x: bigint, y: bigint): [bigint, bigint] {
    const mm = x * y % BigInt(-1);
    const l = x * y;
    let h = mm - l;
    if (mm < l) h -= BigInt(1);
    return [l, h];
  }

  static fullDiv(l: bigint, h: bigint, d: bigint): bigint {
    const pow2 = d & -d;
    d /= pow2;
    l /= pow2;
    l += h * ((-pow2) / pow2 + BigInt(1));
    let r = BigInt(1);
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    r *= BigInt(2) - d * r;
    return l * r;
  }

  static mulDiv(x: bigint, y: bigint, d: bigint): bigint {
    let [l, h] = FullMath.fullMul(x, y);

    const mm = x * y % d;
    if (mm > l) h -= BigInt(1);
    l -= mm;

    if (h == BigInt(0)) return l / d;

    if (h < d) {
      return FullMath.fullDiv(l, h, d)[0];
    } else {
      throw new Error("FullMath: FULLDIV_OVERFLOW");
    }
  }
}
