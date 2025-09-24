import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(
  roleType: Role,
  emailEnvVar: string,
  passwordEnvVar: string,
  nameEnvVar: string,
  defaultName: string
) {
  const email = process.env[emailEnvVar];
  const password = process.env[passwordEnvVar];
  const name = process.env[nameEnvVar] ?? defaultName;

  if (!email || !password) {
    console.warn(`${emailEnvVar} or ${passwordEnvVar} not set. Skipping ${roleType.toLowerCase()} upsert.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: roleType, status: UserStatus.ACTIVE, passwordHash },
    create: { email, name, role: roleType, status: UserStatus.ACTIVE, passwordHash }
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "USER",
      entityId: user.id,
      action: `SEED_${roleType}`,
      actorId: user.id
    }
  });

  console.log(`Seed ${roleType.toLowerCase()} ok:`, { email });
}

async function upsertAdmin() {
  await upsertUser(Role.ADMIN, "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME", "System Admin");
}

async function upsertAuditor() {
  await upsertUser(Role.AUDITOR, "AUDITOR_EMAIL", "AUDITOR_PASSWORD", "AUDITOR_NAME", "Default Auditor");
}

async function upsertAuditee() {
  await upsertUser(Role.AUDITEE, "AUDITEE_EMAIL", "AUDITEE_PASSWORD", "AUDITEE_NAME", "Default Auditee");
}

async function upsertGuest() {
  await upsertUser(Role.GUEST, "GUEST_EMAIL", "GUEST_PASSWORD", "GUEST_NAME", "Default Guest");
}

async function main() {
  await upsertAdmin();
  await upsertAuditor();
  await upsertAuditee();
  await upsertGuest();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });