export function requireServerEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.includes('replace_') || value.includes('your_default') || value.includes('change-me')) {
    throw new Error(`${name} must be configured with a secure value.`)
  }
  return value
}

