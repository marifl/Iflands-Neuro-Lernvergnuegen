export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} muss ein nicht-leerer String sein`)
  }
  return value
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

export function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`${field} hat einen ungueltigen Wert`)
}

export function enumValueWithFallback<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): T {
  if (value === undefined) return fallback
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`${field} hat einen ungueltigen Wert`)
}

export function booleanValue(value: unknown, fallback: boolean, field: string): boolean {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  throw new Error(`${field} muss boolean sein`)
}
