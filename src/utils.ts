export function getEnv(name: string, required: boolean = false): string {
  const value = process.env[name];

  if (!value && required) {
    throw new Error(`Required env variable ${name} not found`);
  }

  if (!value) {
    console.warn(`⚠️ env variable ${name} not found`);
    return "";
  }

  return value;
}
