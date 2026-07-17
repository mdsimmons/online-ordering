import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.log("No TURSO_DATABASE_URL set, skipping");
    process.exit(0);
  }

  console.log("Connecting to Turso...");
  const turso = createClient({ url, authToken });

  try {
    const r = await turso.execute("SELECT 1");
    console.log("Connected to Turso");
  } catch (e) {
    console.error("Failed to connect to Turso:", e.message);
    console.log("Starting app anyway");
    process.exit(0);
  }

  const existing = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Setting'"
  );

  if (existing.rows.length > 0) {
    console.log("Schema already exists on Turso");
    await turso.close();
    process.exit(0);
  }

  console.log("Creating tables on Turso...");

  const tables = [
    `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE, "sortOrder" INTEGER DEFAULT 0, "isActive" INTEGER DEFAULT 1, "availableFrom" TEXT, "availableUntil" TEXT, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "MenuItem" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "price" REAL NOT NULL, "image" TEXT, "isAvailable" INTEGER DEFAULT 1, "availableFrom" TEXT, "availableUntil" TEXT, "outOfStockUntil" TEXT, "outOfStockIndefinite" INTEGER DEFAULT 0, "sortOrder" INTEGER DEFAULT 0, "categoryId" TEXT NOT NULL, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("categoryId") REFERENCES "Category"("id"))`,
    `CREATE TABLE IF NOT EXISTS "ModifierGroup" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "minSelect" INTEGER DEFAULT 0, "maxSelect" INTEGER DEFAULT 1, "isRequired" INTEGER DEFAULT 0, "sortOrder" INTEGER DEFAULT 0, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "ModifierOption" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "price" REAL DEFAULT 0, "outOfStockUntil" TEXT, "outOfStockIndefinite" INTEGER DEFAULT 0, "sortOrder" INTEGER DEFAULT 0, "groupId" TEXT NOT NULL, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id"))`,
    `CREATE TABLE IF NOT EXISTS "MenuItemModifierGroup" ("menuItemId" TEXT NOT NULL, "modifierGroupId" TEXT NOT NULL, PRIMARY KEY ("menuItemId","modifierGroupId"), FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id"), FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id"))`,
    `CREATE TABLE IF NOT EXISTS "Order" ("id" TEXT PRIMARY KEY, "customerName" TEXT NOT NULL, "email" TEXT, "phone" TEXT NOT NULL, "notes" TEXT, "status" TEXT DEFAULT 'pending', "estimatedTime" TEXT, "total" REAL NOT NULL, "couponCode" TEXT, "discountAmount" REAL DEFAULT 0, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "OrderItem" ("id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "menuItemId" TEXT NOT NULL, "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "price" REAL NOT NULL, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("orderId") REFERENCES "Order"("id"), FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id"))`,
    `CREATE TABLE IF NOT EXISTS "OrderItemModifier" ("id" TEXT PRIMARY KEY, "orderItemId" TEXT NOT NULL, "modifierOptionId" TEXT, "name" TEXT NOT NULL, "price" REAL DEFAULT 0, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id"), FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id"))`,
    `CREATE TABLE IF NOT EXISTS "Blacklist" ("id" TEXT PRIMARY KEY, "phone" TEXT, "email" TEXT, "reason" TEXT, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "Setting" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "Coupon" ("id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "discountType" TEXT DEFAULT 'percentage', "discountValue" REAL NOT NULL, "minOrderAmount" REAL, "maxUses" INTEGER, "useCount" INTEGER DEFAULT 0, "expiresAt" TEXT, "isActive" INTEGER DEFAULT 1, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "FeedbackResponse" ("id" TEXT PRIMARY KEY, "phone" TEXT NOT NULL, "customerName" TEXT NOT NULL, "itemId" TEXT NOT NULL, "answers" TEXT NOT NULL, "discountAmount" REAL DEFAULT 0, "discountUsed" INTEGER DEFAULT 0, "orderId" TEXT, "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS "FeedbackResponse_phone_idx" ON "FeedbackResponse"("phone")`,
  ];

  for (const sql of tables) {
    try {
      await turso.execute(sql);
      const name = sql.match(/"(\w+)"/);
      console.log("  Created:", name ? name[1] : "table");
    } catch (e) {
      console.error("  Error:", e.message);
    }
  }

  const migrations = [
    "ALTER TABLE \"Category\" ADD COLUMN \"availableFrom\" TEXT",
    "ALTER TABLE \"Category\" ADD COLUMN \"availableUntil\" TEXT",
    "ALTER TABLE \"MenuItem\" ADD COLUMN \"availableFrom\" TEXT",
    "ALTER TABLE \"MenuItem\" ADD COLUMN \"availableUntil\" TEXT",
  ];

  for (const sql of migrations) {
    try {
      await turso.execute(sql);
      const col = sql.match(/"(\w+)"/g)[1];
      console.log("  Migrated:", col);
    } catch (e) {
      // column may already exist, that's fine
    }
  }

  console.log("Schema push complete");
  await turso.close();
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(0);
});
