```typescript
import { BN } from '@coral-xyz/anchor';

// Constants for bonding curve calculations
export const CURVE_CONSTANTS = {
  // Base price in lamports (0.001 SOL)
  BASE_PRICE: new BN(1_000_000),
  // Price increment factor (16000 / 1000000)
  PRICE_INCREMENT: new BN(16000),
  // Divisor for calculations
  DIVISOR: new BN(1_000_000),
  // Protocol fee percentage (5%)
  PROTOCOL_FEE_PERCENT: new BN(5),
  // Creator fee percentage (5%)
  CREATOR_FEE_PERCENT: new BN(5),
  // Fee divisor (100 for percentage)
  FEE_DIVISOR: new BN(100),
};

export interface PriceCalculation {
  price: BN;
  protocolFee: BN;
  creatorFee: BN;
  totalCost: BN;
}

export interface KeySupplyInfo {
  currentSupply: BN;
  totalSupply: BN;
  price: BN;
  marketCap: BN;
}

/**
 * Calculate the price for buying a specific number of keys
 * Uses quadratic bonding curve: price = basePrice + (supply * increment / divisor)
 */
export function calculateBuyPrice(currentSupply: BN, amount: BN): PriceCalculation {
  let totalPrice = new BN(0);
  
  // Calculate price for each key individually
  for (let i = 0; i < amount.toNumber(); i++) {
    const supply = currentSupply.add(new BN(i));
    const keyPrice = CURVE_CONSTANTS.BASE_PRICE.add(
      supply.mul(CURVE_CONSTANTS.PRICE_INCREMENT).div(CURVE_CONSTANTS.DIVISOR)
    );
    totalPrice = totalPrice.add(keyPrice);
  }
  
  // Calculate fees
  const protocolFee = totalPrice.mul(CURVE_CONSTANTS.PROTOCOL_FEE_PERCENT).div(CURVE_CONSTANTS.FEE_DIVISOR);
  const creatorFee = totalPrice.mul(CURVE_CONSTANTS.CREATOR_FEE_PERCENT).div(CURVE_CONSTANTS.FEE_DIVISOR);
  const totalCost = totalPrice.add(protocolFee).add(creatorFee);
  
  return {
    price: totalPrice,
    protocolFee,
    creatorFee,
    totalCost,
  };
}

/**
 * Calculate the price for selling a specific number of keys
 */
export function calculateSellPrice(currentSupply: BN, amount: BN): PriceCalculation {
  let totalPrice = new BN(0);
  
  // Calculate price for each key individually (in reverse order)
  for (let i = 0; i < amount.toNumber(); i++) {
    const supply = currentSupply.sub(new BN(i + 1));
    const keyPrice = CURVE_CONSTANTS.BASE_PRICE.add(
      supply.mul(CURVE_CONSTANTS.PRICE_INCREMENT).div(CURVE_CONSTANTS.DIVISOR)
    );
    totalPrice = totalPrice.add(keyPrice);
  }
  
  // Calculate fees (deducted from sell price)
  const protocolFee = totalPrice.mul(CURVE_CONSTANTS.PROTOCOL_FEE_PERCENT).div(CURVE_CONSTANTS.FEE_DIVISOR);
  const creatorFee = totalPrice.mul(CURVE_CONSTANTS.CREATOR_FEE_PERCENT).div(CURVE_CONSTANTS.FEE_DIVISOR);
  const totalReceived = totalPrice.sub(protocolFee).sub(creatorFee);
  
  return {
    price: totalPrice,
    protocolFee,
    creatorFee,
    totalCost: totalReceived, // Amount user receives after fees
  };
}

/**
 * Calculate the current price for a single key at given supply
 */
export function getCurrentKeyPrice(supply: BN): BN {
  return CURVE_CONSTANTS.BASE_PRICE.add(
    supply.mul(CURVE_CONSTANTS.PRICE_INCREMENT).div(CURVE_CONSTANTS.DIVISOR)
  );
}

/**
 * Calculate market cap based on current supply
 */
export function calculateMarketCap(supply: BN): BN {
  if (supply.isZero()) {
    return new BN(0);
  }
  
  let totalValue = new BN(0);
  
  // Sum up the price of all keys from 0 to current supply
  for (let i = 0; i < supply.toNumber(); i++) {
    const keyPrice = CURVE_CONSTANTS.BASE_PRICE.add(
      new BN(i).mul(CURVE_CONSTANTS.PRICE_INCREMENT).div(CURVE_CONSTANTS.DIVISOR)
    );
    totalValue = totalValue.add(keyPrice);
  }
  
  return totalValue;
}

/**
 * Get comprehensive key supply information
 */
export function getKeySupplyInfo(currentSupply: BN, totalSupply: BN): KeySupplyInfo {
  const price = getCurrentKeyPrice(currentSupply);
  const marketCap = calculateMarketCap(currentSupply);
  
  return {
    currentSupply,
    totalSupply,
    price,
    marketCap,
  };
}

/**
 * Calculate the maximum number of keys that can be bought with a given amount
 */
export function calculateMaxKeysToBuy(currentSupply: BN, availableFunds: BN): BN {
  let keysCanBuy = new BN(0);
  let totalCost = new BN(0);
  
  // Iterate until we can't afford the next key
  while (true) {
    const nextKeyPrice = calculateBuyPrice(currentSupply.add(keysCanBuy), new BN(1));
    
    if (totalCost.add(nextKeyPrice.totalCost).lte(availableFunds)) {
      totalCost = totalCost.add(nextKeyPrice.totalCost);
      keysCanBuy = keysCanBuy.add(new BN(1));
    } else {
      break;
    }
    
    // Safety check to prevent infinite loops
    if (keysCanBuy.gt(new BN(1000))) {
      break;
    }
  }
  
  return keysCanBuy;
}

/**
 * Format price from lamports to SOL for display
 */
export function formatPriceToSol(lamports: BN): string {
  const sol = lamports.toNumber() / 1_000_000_000;
  return sol.toFixed(6);
}

/**
 * Format price to display with appropriate decimals
 */
export function formatPrice(lamports: BN): string {
  const sol = lamports.toNumber() / 1_000_000_000;
  
  if (sol < 0.001) {
    return `${(sol * 1000).toFixed(3)}m SOL`;
  } else if (sol < 1) {
    return `${sol.toFixed(6)} SOL`;
  } else {
    return `${sol.toFixed(3)} SOL`;
  }
}

/**
 * Calculate price impact for a trade
 */
export function calculatePriceImpact(
  currentSupply: BN,
  amount: BN,
  isBuy: boolean
): number {
  const currentPrice = getCurrentKeyPrice(currentSupply);
  
  let newPrice: BN;
  if (isBuy) {
    newPrice = getCurrentKeyPrice(currentSupply.add(amount));
  } else {
    newPrice = getCurrentKeyPrice(currentSupply.sub(amount));
  }
  
  const priceDiff = newPrice.sub(currentPrice).abs();
  const impact = (priceDiff.toNumber() / currentPrice.toNumber()) * 100;
  
  return Math.min(impact, 100); // Cap at 100%
}

/**
 * Generate price points for bonding curve visualization
 */
export function generateCurvePoints(maxSupply: number, points: number = 100): Array<{ supply: number; price: number }> {
  const step = Math.max(1, Math.floor(maxSupply / points));
  const curvePoints: Array<{ supply: number; price: number }> = [];
  
  for (let i = 0; i <= maxSupply; i += step) {
    const supply = new BN(i);
    const price = getCurrentKeyPrice(supply);
    curvePoints.push({
      supply: i,
      price: price.toNumber() / 1_000_000_000, // Convert to SOL
    });
  }
  
  return curvePoints;
}

/**
 * Validate trade parameters
 */
export function validateTrade(
  currentSupply: BN,
  amount: BN,
  isBuy: boolean,
  userBalance?: BN
): { isValid: boolean; error?: string } {
  if (amount.lte(new BN(0))) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (isBuy) {
    if (userBalance) {
      const cost = calculateBuyPrice(currentSupply, amount);
      if (cost.totalCost.gt(userBalance)) {
        return { isValid: false, error: 'Insufficient funds' };
      }
    }
  } else {
    if (amount.gt(currentSupply)) {
      return { isValid: false, error: 'Cannot sell more keys than supply' };
    }
  }
  
  return { isValid: true };
}
```