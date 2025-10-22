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

// RBAC v2 Role Functions

async function upsertCFO() {
  await upsertUser(Role.CFO, "CFO_EMAIL", "CFO_PASSWORD", "CFO_NAME", "Chief Financial Officer");
}

async function upsertCXOTeam() {
  await upsertUser(Role.CXO_TEAM, "CXO_EMAIL", "CXO_PASSWORD", "CXO_NAME", "CXO Team Member");
}

async function upsertCXOTeam2() {
  await upsertUser(Role.CXO_TEAM, "CXO2_EMAIL", "CXO2_PASSWORD", "CXO2_NAME", "CXO Team Member 2");
}

async function upsertAuditHead() {
  await upsertUser(Role.AUDIT_HEAD, "AUDIT_HEAD_EMAIL", "AUDIT_HEAD_PASSWORD", "AUDIT_HEAD_NAME", "Audit Head");
}

async function upsertAuditor() {
  await upsertUser(Role.AUDITOR, "AUDITOR_EMAIL", "AUDITOR_PASSWORD", "AUDITOR_NAME", "Auditor 1");
}

async function upsertAuditor2() {
  await upsertUser(Role.AUDITOR, "AUDITOR2_EMAIL", "AUDITOR2_PASSWORD", "AUDITOR2_NAME", "Auditor 2");
}

async function upsertAuditor3() {
  await upsertUser(Role.AUDITOR, "AUDITOR3_EMAIL", "AUDITOR3_PASSWORD", "AUDITOR3_NAME", "Auditor 3");
}

async function upsertAuditee() {
  await upsertUser(Role.AUDITEE, "AUDITEE_EMAIL", "AUDITEE_PASSWORD", "AUDITEE_NAME", "Auditee 1");
}

async function upsertAuditee2() {
  await upsertUser(Role.AUDITEE, "AUDITEE2_EMAIL", "AUDITEE2_PASSWORD", "AUDITEE2_NAME", "Auditee 2");
}

async function upsertGuest() {
  await upsertUser(Role.GUEST, "GUEST_EMAIL", "GUEST_PASSWORD", "GUEST_NAME", "Default Guest");
}

async function main() {
  console.log("🌱 Seeding database with RBAC v2 roles...\n");

  // CFO - Organization superuser
  await upsertCFO();

  // CXO Team - Audit and plant managers
  await upsertCXOTeam();
  await upsertCXOTeam2();

  // Audit Head - Approval authority
  await upsertAuditHead();

  // Auditors - Observation authors
  await upsertAuditor();
  await upsertAuditor2();
  await upsertAuditor3();

  // Auditees - Observation responders
  await upsertAuditee();
  await upsertAuditee2();

  // Guest - Read-only (optional)
  await upsertGuest();

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });