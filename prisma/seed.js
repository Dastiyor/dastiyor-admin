const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");

// This script adds test accounts (with a password that is in git) and fake users
// and tasks. Only run it against a local database, never the shared production one.
function assertLocalDatabase() {
  const raw = process.env.POSTGRES_PRISMA_URL || "";
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {}
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  if (!local && process.env.SEED_ALLOW_REMOTE_DB !== "yes") {
    console.error(
      `Refusing to seed: POSTGRES_PRISMA_URL points to "${host || "(unset)"}", not a local database.\n` +
        "Seeding adds test accounts and fake data. Set SEED_ALLOW_REMOTE_DB=yes only if you really mean it."
    );
    process.exit(1);
  }
}
assertLocalDatabase();

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("admin123", 10);

  // 1. Create Key Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@dastiyor.com" },
    update: {},
    create: {
      fullName: "Dastiyor Admin",
      email: "admin@dastiyor.com",
      password: hashed,
      role: "ADMIN",
      isVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@dastiyor.com" },
    update: {},
    create: {
      fullName: "Test Customer",
      email: "customer@dastiyor.com",
      password: hashed,
      role: "CUSTOMER",
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: "provider@dastiyor.com" },
    update: {},
    create: {
      fullName: "Test Provider",
      email: "provider@dastiyor.com",
      password: hashed,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  console.log("Key users seeded.");

  // 2. Clear existing non-key data (optional, but good for clean slate if needed)
  // await prisma.task.deleteMany({}); 
  // await prisma.user.deleteMany({ where: { email: { notIn: ["admin@dastiyor.com", "customer@dastiyor.com", "provider@dastiyor.com"] } } });

  // 3. Create 50 Random Users
  const randomUsers = [];
  for (let i = 0; i < 50; i++) {
    const role = faker.helpers.arrayElement(["CUSTOMER", "PROVIDER"]);
    const user = await prisma.user.create({
      data: {
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: hashed,
        role: role,
        isVerified: faker.datatype.boolean({ probability: 0.7 }),
        phone: faker.phone.number(),
        bio: faker.lorem.sentence(),
        createdAt: faker.date.past(),
      },
    });
    randomUsers.push(user);
  }
  console.log(`Seeded ${randomUsers.length} random users.`);

  // 4. Create 100 Random Tasks
  const categories = ["Cleaning", "Repair", "Moving", "IT Support", "Tutor", "Beauty"];
  const cities = ["Dushanbe", "Khujand", "Bokhtar", "Kulob"];

  const customerUsers = randomUsers.filter(u => u.role === "CUSTOMER");
  // If no random customers, use the test customer
  const taskCreators = customerUsers.length > 0 ? customerUsers : [customer];

  for (let i = 0; i < 100; i++) {
    const creator = faker.helpers.arrayElement(taskCreators);
    await prisma.task.create({
      data: {
        title: faker.lorem.words({ min: 3, max: 6 }),
        description: faker.lorem.paragraph(),
        category: faker.helpers.arrayElement(categories),
        city: faker.helpers.arrayElement(cities),
        budgetType: faker.helpers.arrayElement(["fixed", "negotiable"]),
        budgetAmount: faker.commerce.price({ min: 50, max: 1000 }),
        status: faker.helpers.arrayElement(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
        urgency: faker.helpers.arrayElement(["low", "normal", "high"]),
        userId: creator.id,
        createdAt: faker.date.past(),
      },
    });
  }
  console.log("Seeded 100 random tasks.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
