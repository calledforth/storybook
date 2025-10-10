type RequiredEnvVar = "REPLICATE_API_TOKEN" | "REPLICATE_OWNER" | "GEMINI_API_KEY";

function getEnv(name: RequiredEnvVar) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const env = {
  REPLICATE_API_TOKEN: getEnv("REPLICATE_API_TOKEN"),
  REPLICATE_OWNER: getEnv("REPLICATE_OWNER"),
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY"),
};


