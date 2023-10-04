export class Babylonian {
  // Computes the square root of a number using the Babylonian method.
  // Returns the largest integer value that is less than or equal to the square root.
  static sqrt(y: bigint): bigint {
    if (y > BigInt(3)) {
      let z = y;
      let x = y / BigInt(2) + BigInt(1);
      while (x < z) {
        z = x;
        x = (y / x + x) / BigInt(2);
      }
      return z;
    } else if (y != BigInt(0)) {
      return BigInt(1);
    } else {
      return BigInt(0);
    }
  }
}
