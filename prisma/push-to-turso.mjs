import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.log("No TURSO_DATABASE_URL set, skipping Turso setup");
    process.exit(0);
  }

  const turso = createClient({ url, authToken });

  // Check if tables already exist
  const result = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='MenuItem'"
  );

  if (result.rows.length > 0) {
    console.log("Schema already exists on Turso");
    await turso.close();
    process.exit(0);
  }

  console.log("Pushing schema to Turso...");

  // Create tables matching Prisma schema
  const statements = [
    `CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "MenuItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "image" TEXT,
      "isAvailable" BOOLEAN NOT NULL DEFAULT true,
      "outOfStockUntil" DATETIME,
      "outOfStockIndefinite" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "categoryId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "ModifierGroup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "minSelect" INTEGER NOT NULL DEFAULT 0,
      "maxSelect" INTEGER NOT NULL DEFAULT 1,
      "isRequired" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "ModifierOption" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "price" REAL NOT NULL DEFAULT 0,
      "outOfStockUntil" DATETIME,
      "outOfStockIndefinite" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "groupId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "MenuItemModifierGroup" (
      "menuItemId" TEXT NOT NULL,
      "modifierGroupId" TEXT NOT NULL,
      PRIMARY KEY ("menuItemId", "modifierGroupId"),
      FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id"),
      FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerName" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT NOT NULL,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "estimatedTime" TEXT,
      "total" REAL NOT NULL,
      "couponCode" TEXT,
      "discountAmount" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "menuItemId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("orderId") REFERENCES "Order"("id"),
      FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "OrderItemModifier" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderItemId" TEXT NOT NULL,
      "modifierOptionId" TEXT,
      "name" TEXT NOT NULL,
      "price" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id"),
      FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "Blacklist" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "phone" TEXT,
      "email" TEXT,
      "reason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "Coupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "discountType" TEXT NOT NULL DEFAULT 'percentage',
      "discountValue" REAL NOT NULL,
      "minOrderAmount" REAL,
      "maxUses" INTEGER,
      "useCount" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    try {
      await turso.execute(sql);
    } catch (e) {
      console.error("Error creating table:", e);
    }
  }

  console.log("Schema pushed to Turso successfully");
  await turso.close();
}

main().catch((e) => {
  console.error("Turso setup failed:", e);
  process.exit(1);
});
