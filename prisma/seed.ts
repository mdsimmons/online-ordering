import prisma from "../src/lib/prisma";

async function main() {
  const existingItems = await prisma.menuItem.count();
  if (existingItems > 0) {
    console.log("Seed data already exists. Skipping.");
    return;
  }

  const burgers = await prisma.category.create({
    data: { name: "Burgers", slug: "burgers", sortOrder: 0 },
  });
  const sandwiches = await prisma.category.create({
    data: { name: "Sandwiches", slug: "sandwiches", sortOrder: 1 },
  });
  const sides = await prisma.category.create({
    data: { name: "Sides", slug: "sides", sortOrder: 2 },
  });
  const drinks = await prisma.category.create({
    data: { name: "Drinks", slug: "drinks", sortOrder: 3 },
  });

  const pattyOpt = await prisma.modifierGroup.create({
    data: {
      name: "Patty Doneness",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { name: "Medium Rare", price: 0, sortOrder: 0 },
          { name: "Medium", price: 0, sortOrder: 1 },
          { name: "Well Done", price: 0, sortOrder: 2 },
        ],
      },
    },
  });

  const cheeseOpt = await prisma.modifierGroup.create({
    data: {
      name: "Extra Cheese",
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      options: {
        create: [
          { name: "American", price: 1.5, sortOrder: 0 },
          { name: "Swiss", price: 2.0, sortOrder: 1 },
          { name: "Pepper Jack", price: 1.5, sortOrder: 2 },
        ],
      },
    },
  });

  const toppingsOpt = await prisma.modifierGroup.create({
    data: {
      name: "Extra Toppings",
      minSelect: 0,
      maxSelect: 3,
      isRequired: false,
      options: {
        create: [
          { name: "Bacon", price: 2.0, sortOrder: 0 },
          { name: "Avocado", price: 1.5, sortOrder: 1 },
          { name: "Fried Egg", price: 1.5, sortOrder: 2 },
          { name: "Caramelized Onions", price: 1.0, sortOrder: 3 },
          { name: "Jalapeños", price: 0.75, sortOrder: 4 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Classic Burger",
      description: "Juicy beef patty with lettuce, tomato, pickles & our signature sauce",
      price: 12.99,
      categoryId: burgers.id,
      sortOrder: 0,
      modifierGroups: {
        create: [
          { modifierGroupId: pattyOpt.id },
          { modifierGroupId: cheeseOpt.id },
          { modifierGroupId: toppingsOpt.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Double Smash Burger",
      description: "Two smashed beef patties with American cheese, onions & pickles",
      price: 15.99,
      categoryId: burgers.id,
      sortOrder: 1,
      modifierGroups: {
        create: [
          { modifierGroupId: pattyOpt.id },
          { modifierGroupId: cheeseOpt.id },
          { modifierGroupId: toppingsOpt.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Bacon Cheeseburger",
      description: "Thick-cut bacon, cheddar, lettuce, tomato & smoky mayo on a toasted brioche bun",
      price: 14.99,
      categoryId: burgers.id,
      sortOrder: 2,
      modifierGroups: {
        create: [
          { modifierGroupId: pattyOpt.id },
          { modifierGroupId: cheeseOpt.id },
          { modifierGroupId: toppingsOpt.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Crispy Chicken Sandwich",
      description: "Buttermilk-brined chicken breast, lettuce, pickles & comeback sauce on brioche",
      price: 13.99,
      categoryId: sandwiches.id,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Philly Cheesesteak",
      description: "Thin-sliced ribeye, sautéed onions, bell peppers & provolone on a toasted hoagie",
      price: 14.99,
      categoryId: sandwiches.id,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Truffle Fries",
      description: "Hand-cut fries tossed in truffle oil, parmesan & parsley",
      price: 6.99,
      categoryId: sides.id,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Onion Rings",
      description: "Beer-battered thick-cut onion rings with chipotle aioli",
      price: 7.99,
      categoryId: sides.id,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Side Salad",
      description: "Mixed greens, cherry tomatoes, cucumber & balsamic vinaigrette",
      price: 4.99,
      categoryId: sides.id,
      sortOrder: 2,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Soda",
      description: "Choose from Coke, Sprite, Dr Pepper, or Lemonade",
      price: 2.49,
      categoryId: drinks.id,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Milkshake",
      description: "Hand-spun vanilla, chocolate or strawberry shake with whipped cream",
      price: 5.99,
      categoryId: drinks.id,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Iced Tea",
      description: "Fresh-brewed sweet or unsweetened tea",
      price: 2.49,
      categoryId: drinks.id,
      sortOrder: 2,
    },
  });

  await prisma.setting.upsert({
    where: { key: "restaurantName" },
    update: { value: "Burger Joint" },
    create: { key: "restaurantName", value: "Burger Joint" },
  });
  await prisma.setting.upsert({
    where: { key: "restaurantAddress" },
    update: { value: "123 Main St, Anytown USA" },
    create: { key: "restaurantAddress", value: "123 Main St, Anytown USA" },
  });
  await prisma.setting.upsert({
    where: { key: "restaurantPhone" },
    update: { value: "(555) 123-4567" },
    create: { key: "restaurantPhone", value: "(555) 123-4567" },
  });
  await prisma.setting.upsert({
    where: { key: "pickupInstructions" },
    update: { value: "Park in the pickup spots and call when you arrive." },
    create: { key: "pickupInstructions", value: "Park in the pickup spots and call when you arrive." },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
