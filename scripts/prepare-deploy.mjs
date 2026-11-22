// ============================================================================
// MATOSHREE CLINIC EMR — DATABASE DEPLOYMENT ADAPTER
// Automatically adapts Prisma schema provider based on DATABASE_URL
// Supports: Neon Serverless PostgreSQL (Production) & SQLite (Local Offline)
// ============================================================================

import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(process.cwd(), "prisma", "schema.prisma");

function getTargetProvider() {
  const arg = process.argv[2]?.toLowerCase();
  if (arg === "postgresql" || arg === "postgres") return "postgresql";
  if (arg === "sqlite") return "sqlite";

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    return "postgresql";
  }
  if (dbUrl.startsWith("file:")) {
    return "sqlite";
  }

  return null;
}

function adaptSchema() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Prisma schema not found at: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  let content = fs.readFileSync(SCHEMA_PATH, "utf8");
  const targetProvider = getTargetProvider();

  if (!targetProvider) {
    console.log("ℹ️ No specific provider override detected in DATABASE_URL or arguments. Keeping current schema configuration.");
    return;
  }

  const currentMatch = content.match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"[^}]*\}/s);
  const currentProvider = currentMatch ? currentMatch[1] : null;

  if (currentProvider === targetProvider) {
    console.log(`✅ Prisma schema datasource provider is already '${targetProvider}'.`);
    return;
  }

  console.log(`🔄 Updating Prisma datasource provider from '${currentProvider}' to '${targetProvider}' for deployment...`);
  
  // Replace provider inside datasource db block
  content = content.replace(
    /(datasource\s+db\s*\{[^}]*provider\s*=\s*")[^"]+(")/s,
    `$1${targetProvider}$2`
  );

  fs.writeFileSync(SCHEMA_PATH, content, "utf8");
  console.log(`✅ Prisma schema successfully configured for ${targetProvider.toUpperCase()} (${targetProvider === "postgresql" ? "Neon Serverless" : "Local SQLite"})!`);
}

adaptSchema();
