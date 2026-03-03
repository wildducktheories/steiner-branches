// Steiner Branches Model
// Implements A(n,x), B(n,x), C(n,x) formulas and Collatz map logic

class SteinerBranches {
  /**
   * Compute A(n,x) branch formula
   * A(n,x) = {
   *   undefined,                          if n <= 1
   *   3·2^(n-1) + 2^(n+1)·x - 1,          if n > 1 and n odd
   *   2^(n-1) + 2^(n+1)·x - 1,            if n > 1 and n even
   * }
   */
  static A(n, x) {
    if (n <= 1) {
      return null;
    }
    const nOdd = n % 2 === 1;
    if (nOdd) {
      return 3n * (1n << BigInt(n - 1)) + (1n << BigInt(n + 1)) * BigInt(x) - 1n;
    } else {
      return (1n << BigInt(n - 1)) + (1n << BigInt(n + 1)) * BigInt(x) - 1n;
    }
  }

  /**
   * Compute B(n,x) branch formula
   * B(n,x) = {
   *   3·2^n + 2^(n+2)·x - 1,  if n odd
   *   2^n + 2^(n+2)·x - 1,    if n even
   * }
   */
  static B(n, x) {
    const nOdd = n % 2 === 1;
    if (nOdd) {
      return 3n * (1n << BigInt(n)) + (1n << BigInt(n + 2)) * BigInt(x) - 1n;
    } else {
      return (1n << BigInt(n)) + (1n << BigInt(n + 2)) * BigInt(x) - 1n;
    }
  }

  /**
   * Compute C(n,x) endpoint formula
   * C(n,x) = 2·3^n·x + 4·Σ(i=0 to ⌊(n-1)/2⌋) 9^i
   */
  static C(n, x) {
    const xBig = BigInt(x);
    const nBig = BigInt(n);

    // First term: 2·3^n·x
    const term1 = 2n * (3n ** nBig) * xBig;

    // Second term: 4·Σ(i=0 to ⌊(n-1)/2⌋) 9^i
    const limit = Math.floor((n - 1) / 2);
    let sum = 0n;
    for (let i = 0; i <= limit; i++) {
      sum += 9n ** BigInt(i);
    }
    const term2 = 4n * sum;

    return term1 + term2;
  }

  /**
   * Standard Collatz map
   * T(n) = n/2 if n even, (3n+1)/2 if n odd
   */
  static collatz(n) {
    const nBig = BigInt(n);
    if (nBig % 2n === 0n) {
      return nBig / 2n;
    } else {
      return (3n * nBig + 1n) / 2n;
    }
  }

  /**
   * Find which branch formula (if any) generates a given odd number m
   * Returns {branch: 'A'|'B', n, x} or null if not matched
   */
  static findBranch(m) {
    const mBig = BigInt(m);
    if (mBig % 2n === 0n || mBig < 1n) return null;

    // Try various n values (extended range for larger trajectories)
    for (let n = 1; n <= 30; n++) {
      // Check A(n,x): solve for x
      // A(n,x) = base_A + 2^(n+1)·x - 1, so x = (m - base_A + 1) / 2^(n+1)
      const nOdd = n % 2 === 1;
      const baseA = nOdd ? 3n * (1n << BigInt(n - 1)) : (1n << BigInt(n - 1));
      const divisor = 1n << BigInt(n + 1);

      const numeratorA = mBig - baseA + 1n;
      if (numeratorA >= 0n && numeratorA % divisor === 0n) {
        const x = Number(numeratorA / divisor);
        if (x >= 0 && x < 1000000) {  // Very large x range - no practical limit
          return { branch: 'A', n, x };
        }
      }

      // Check B(n,x): solve for x
      // B(n,x) = base_B + 2^(n+2)·x - 1, so x = (m - base_B + 1) / 2^(n+2)
      const baseB = nOdd ? 3n * (1n << BigInt(n)) : (1n << BigInt(n));
      const divisorB = 1n << BigInt(n + 2);

      const numeratorB = mBig - baseB + 1n;
      if (numeratorB >= 0n && numeratorB % divisorB === 0n) {
        const x = Number(numeratorB / divisorB);
        if (x >= 0 && x < 1000000) {  // Very large x range - no practical limit
          return { branch: 'B', n, x };
        }
      }
    }

    return null;
  }

  /**
   * Check if an even number is an endpoint C(n,x) for some n,x
   * Returns {n, x} or null
   */
  static isEndpoint(m) {
    const mBig = BigInt(m);
    if (mBig % 2n !== 0n || mBig < 1n) return null;

    // Try various n values
    for (let n = 1; n <= 20; n++) {
      // C(n,x) = 2·3^n·x + const_part
      // Solve for x: x = (m - const_part) / (2·3^n)

      const limit = Math.floor((n - 1) / 2);
      let sum = 0n;
      for (let i = 0; i <= limit; i++) {
        sum += 9n ** BigInt(i);
      }
      const constPart = 4n * sum;

      const numerator = mBig - constPart;
      const divisor = 2n * (3n ** BigInt(n));

      if (numerator >= 0n && numerator % divisor === 0n) {
        const x = Number(numerator / divisor);
        if (x >= 0 && x < 100) {
          return { n, x };
        }
      }
    }

    return null;
  }

  /**
   * Generate lattice points for visualization
   * Returns array of {n, x, value, branch: 'A'|'B'}
   */
  static generateLattice(maxN, maxX) {
    const points = [];

    for (let n = 1; n <= maxN; n++) {
      for (let x = 0; x <= maxX; x++) {
        const aVal = this.A(n, x);
        const bVal = this.B(n, x);

        // Only add A point if it's defined (n > 1)
        if (aVal !== null) {
          points.push({
            n, x,
            value: aVal,
            branch: 'A',
            endpoint: this.C(n, x)
          });
        }

        points.push({
          n, x,
          value: bVal,
          branch: 'B',
          endpoint: this.C(n, x)
        });
      }
    }

    return points;
  }

  /**
   * Compute Collatz trajectory from m until reaching 1 or max steps
   * Returns array of {value, step, isOdd, isEndpoint}
   */
  static trajectory(m, maxSteps = 100) {
    const path = [];
    let current = BigInt(m);
    let step = 0;

    while (step < maxSteps && current > 1n) {
      const isOdd = current % 2n === 1n;
      const endpoint = isOdd ? null : this.isEndpoint(current);

      path.push({
        value: current,
        step,
        isOdd,
        isEndpoint: endpoint !== null,
        endpointParams: endpoint
      });

      // Continue to 1 (don't stop at intermediate endpoints)
      current = this.collatz(current);
      step++;
    }

    // Add final value (should be 1)
    if (current === 1n) {
      path.push({
        value: current,
        step,
        isOdd: current % 2n === 1n,
        isEndpoint: true,
        endpointParams: null
      });
    }

    return path;
  }
}
