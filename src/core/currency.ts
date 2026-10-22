export const HYE = {
  name: 'Hye',
  symbol: '₾',
  short: 'H',
  color: '#E8B95C',
  sound: 'coin-clink',
  format: (n: number) => `${n.toLocaleString()} ₾`,
  formatShort: (n: number) => `${n.toLocaleString()}H`,
};

export function addHye(current: number, amount: number): number {
  return Math.max(0, current + amount);
}

export function subtractHye(current: number, amount: number): number {
  return Math.max(0, current - amount);
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}