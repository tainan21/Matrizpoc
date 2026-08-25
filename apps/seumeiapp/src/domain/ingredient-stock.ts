export type IngredientStockMovementType = "ENTRY" | "EXIT" | "RECONCILIATION"

export class InvalidStockMovementError extends Error {
  constructor(message = "Movimento de estoque inválido") { super(message); this.name = "InvalidStockMovementError" }
}
export class InsufficientIngredientStockError extends Error {
  constructor() { super("Saldo insuficiente"); this.name = "InsufficientIngredientStockError" }
}

export function applyIngredientStockMovement(
  balance: number,
  input: { type: IngredientStockMovementType; quantity: number; reason: string; notes?: string | null },
) {
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(input.quantity) || input.quantity < 0) {
    throw new InvalidStockMovementError()
  }
  const reason = input.reason.trim().replace(/\s+/g, " ")
  const notes = input.notes?.trim().replace(/\s+/g, " ") ?? ""
  if (!reason || reason.length > 160 || notes.length > 500) throw new InvalidStockMovementError()

  const signedQuantity = input.type === "ENTRY"
    ? input.quantity
    : input.type === "EXIT"
      ? -input.quantity
      : input.quantity - balance
  if (signedQuantity === 0) throw new InvalidStockMovementError("O movimento não pode manter o mesmo saldo")
  const balanceAfter = balance + signedQuantity
  if (balanceAfter < 0) throw new InsufficientIngredientStockError()
  return { signedQuantity, balanceBefore: balance, balanceAfter }
}

export function ingredientStockHealth(balance: number, threshold: number): "out" | "low" | "healthy" {
  if (balance === 0) return "out"
  return balance <= threshold ? "low" : "healthy"
}
