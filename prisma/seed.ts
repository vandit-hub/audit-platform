import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "System Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin upsert.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: Role.ADMIN, status: UserStatus.ACTIVE, passwordHash },
    create: { email, name, role: Role.ADMIN, status: UserStatus.ACTIVE, passwordHash }
  });

  await prisma.auditEvent.create({
    data: { entityType: "USER", entityId: admin.id, action: "SEED_ADMIN", actorId: admin.id }
  });

  console.log("Seed admin ok:", { email });
}

async function installLockedFieldsTrigger() {
  // Deny UPDATE of any column named inside NEW.lockedFields (jsonb array)
  // We compare to_jsonb(OLD)->>field vs to_jsonb(NEW)->>field

  // Create the function
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION observation_prevent_locked_update() RETURNS trigger AS $$
    DECLARE
      fld text;
      old_val text;
      new_val text;
    BEGIN
      IF NEW."lockedFields" IS NULL THEN
        RETURN NEW;
      END IF;

      FOR fld IN SELECT jsonb_array_elements_text(NEW."lockedFields")
      LOOP
        -- Compare values at the text level; if changed, deny.
        old_val := to_jsonb(OLD)->>fld;
        new_val := to_jsonb(NEW)->>fld;
        IF old_val IS DISTINCT FROM new_val THEN
          RAISE EXCEPTION 'Field "%" is locked and cannot be changed', fld
            USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;
      END LOOP;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Check and drop existing trigger if exists
  const triggerExists = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'Observation'
    AND trigger_name = 'observation_prevent_locked_update'
    LIMIT 1
  `;

  if (Array.isArray(triggerExists) && triggerExists.length > 0) {
    await prisma.$executeRawUnsafe(`DROP TRIGGER observation_prevent_locked_update ON "Observation"`);
  }

  // Create the trigger
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER observation_prevent_locked_update
    BEFORE UPDATE ON "Observation"
    FOR EACH ROW EXECUTE FUNCTION observation_prevent_locked_update()
  `);

  console.log("Locked-fields trigger installed.");
}

async function main() {
  await upsertAdmin();
  await installLockedFieldsTrigger();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });