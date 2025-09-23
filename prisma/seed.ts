import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "System Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash
    },
    create: {
      email,
      name,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash
    }
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "USER",
      entityId: admin.id,
      action: "SEED_ADMIN",
      actorId: admin.id
    }
  });

  console.log("Seed complete. Admin:", { email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });