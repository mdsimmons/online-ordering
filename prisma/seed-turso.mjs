import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const tursoUrl = process.env.TURSO_DATABASE_URL;
if (!tursoUrl) {
  console.error("TURSO_DATABASE_URL env var required");
  process.exit(1);
}

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

const data = {
  "Paw-Paw's Specials": [
    { name: "Paw-Paw's Special", price: 7.99, description: "Bacon Double Cheeseburger with Lettuce, Tomato and Mayo. Served with Fries" },
    { name: "Hot Dog Special", price: 5.99, description: "Two all-beef Hot Dogs served with Fries" },
  ],
  Sandwiches: [
    { name: "Hot Dog", price: 2.49 },
    { name: "Grilled Cheese", price: 2.49, description: "American cheese and mayo on your choice of white or wheat bread, buttered, and toasted." },
    { name: "BLT", price: 3.59 },
    { name: "Chicken Salad Sandwich", price: 3.59 },
    { name: "Chicken Fillet", price: 4.19 },
    { name: "Grilled Chicken Sandwich", price: 4.19 },
    { name: "BBQ Sandwich", price: 4.79 },
    { name: "Cheeseburger", price: 4.69 },
    { name: "Chicken Parmesan Sandwich", price: 4.99 },
    { name: "Philly Chicken", price: 5.49 },
    { name: "Philly Cheesesteak", price: 5.49 },
    { name: "Triple Decker Club", price: 5.59 },
    { name: "Double Cheeseburger", price: 6.49 },
  ],
  Plates: [
    { name: "Chicken Salad Sandwich Plate", price: 5.19, description: "Served with chips and a pickle." },
    { name: "Cold Plate", price: 5.59, description: "Chicken salad served on a bed of lettuce with a side of peaches and tomatoes." },
    { name: "Triple Decker Club Plate", price: 6.39, description: "Served with chips and a pickle." },
    { name: "Grilled Chicken Plate", price: 6.39, description: "Grilled chicken served with two side items." },
    { name: "Chicken Tender Plate", price: 6.39, description: "Three chicken tenders served with two side items." },
    { name: "Smothered Chicken Plate", price: 6.59, description: "Grilled chicken covered in Swiss cheese peppers, onions, and mushrooms." },
    { name: "Chopped BBQ Plate", price: 7.19, description: "Chopped BBQ served with two sides." },
    { name: "Hamburger Steak Plate", price: 7.19, description: "Hamburger steak served with two side items." },
  ],
  Salads: [
    { name: "House Salad", price: 3.00, description: "Fresh lettuce, tomatoes, onions, cheese, and croutons." },
    { name: "Side Salad", price: 2.99 },
    { name: "Chef Salad", price: 5.79, description: "Fresh lettuce, tomatoes, onions, cheese, croutons, ham, and bacon." },
    { name: "Grilled Chicken Salad", price: 6.99, description: "Fresh salad made with grilled chicken, lettuce, tomatoes, onions, cheese, croutons, and bacon." },
  ],
  Sides: [
    { name: "French Fries", price: 1.75 },
    { name: "Seasoned Fries", price: 1.75 },
    { name: "Basket of Fries", price: 4.00 },
    { name: "Coleslaw" },
    { name: "Fried Okra" },
    { name: "Onion Rings" },
    { name: "Potato Salad" },
    { name: "Baked Beans" },
    { name: "Fried Pickles" },
  ],
  "Kids Plates": [
    { name: "Kids Hot Dog", price: 4.79, description: "Served with fries and a drink." },
    { name: "Kids Cheeseburger", price: 4.79, description: "Served with fries and a drink." },
    { name: "Kids Grilled Cheese", price: 4.79, description: "Served with fries and a drink." },
    { name: "Kids Chicken Tenders", price: 4.79, description: "Two chicken tenders served with fries and a drink." },
    { name: "Kids Corndog", price: 4.79, description: "Served with fries and a drink." },
  ],
  Drinks: [
    { name: "Sweet Tea", price: 1.59 },
    { name: "Unsweet Tea", price: 1.59 },
    { name: "Coffee", price: 1.59 },
    { name: "Pepsi", price: 1.99 },
    { name: "Diet Pepsi", price: 1.99 },
    { name: "Mountain Dew", price: 1.99 },
    { name: "Diet Mountain Dew", price: 1.99 },
    { name: "Cheerwine", price: 1.99 },
    { name: "Dr. Pepper", price: 1.99 },
    { name: "Sierra Mist", price: 1.99 },
    { name: "Pink Lemonade", price: 1.99 },
    { name: "Milk", price: 1.79 },
    { name: "Chocolate Milk", price: 1.79 },
    { name: "Apple Juice", price: 1.79 },
    { name: "Orange Juice", price: 1.79 },
  ],
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  // Clear existing data
  for (const model of ["orderItemModifier", "orderItem", "order", "menuItemModifierGroup", "menuItem", "modifierOption", "modifierGroup", "category", "coupon", "blacklist"]) {
    await prisma[model].deleteMany();
  }
  console.log("Cleared existing data.");

  let sortOrder = 0;
  for (const [catName, items] of Object.entries(data)) {
    const cat = await prisma.category.create({
      data: {
        name: catName,
        slug: slugify(catName),
        sortOrder,
      },
    });
    sortOrder++;
    console.log(`Created: ${catName}`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await prisma.menuItem.create({
        data: {
          name: item.name,
          description: item.description || "",
          price: item.price || 0,
          categoryId: cat.id,
          sortOrder: i,
          isAvailable: true,
        },
      });
    }
    console.log(`  Added ${items.length} items.`);
  }
  console.log("\nDone! Turso database seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
