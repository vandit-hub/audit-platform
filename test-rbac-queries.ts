/**
 * Test script for RBAC queries (Phase 2)
 *
 * Run with: npx tsx test-rbac-queries.ts
 */

import { prisma } from "./src/server/db";
import {
  buildAuditWhereClause,
  getAuditsForUser,
  canAccessObservation,
  canAccessAudit,
  buildObservationWhereClause,
  getObservationsForUser,
  getObservationStats
} from "./src/lib/rbac-queries";

async function main() {
  console.log("\n=== Testing RBAC Queries (Phase 2) ===\n");

  // Get test users
  const cfo = await prisma.user.findFirst({ where: { role: "CFO" } });
  const cxoTeam = await prisma.user.findFirst({ where: { role: "CXO_TEAM" } });
  const auditHead = await prisma.user.findFirst({ where: { role: "AUDIT_HEAD" } });
  const auditor = await prisma.user.findFirst({ where: { role: "AUDITOR" } });
  const auditee = await prisma.user.findFirst({ where: { role: "AUDITEE" } });
  const guest = await prisma.user.findFirst({ where: { role: "GUEST" } });

  if (!cfo || !cxoTeam || !auditHead || !auditor || !auditee) {
    console.error("❌ Required test users not found. Run npm run db:seed first.");
    return;
  }

  console.log("✅ Found test users:");
  console.log(`   CFO: ${cfo.email}`);
  console.log(`   CXO_TEAM: ${cxoTeam.email}`);
  console.log(`   AUDIT_HEAD: ${auditHead.email}`);
  console.log(`   AUDITOR: ${auditor.email}`);
  console.log(`   AUDITEE: ${auditee.email}`);
  if (guest) console.log(`   GUEST: ${guest.email}`);

  // Test 1: buildAuditWhereClause
  console.log("\n--- Test 1: buildAuditWhereClause ---");

  const cfoAuditWhere = buildAuditWhereClause(cfo.id, cfo.role);
  console.log("✓ CFO audit where clause:", JSON.stringify(cfoAuditWhere, null, 2));

  const auditHeadAuditWhere = buildAuditWhereClause(auditHead.id, auditHead.role);
  console.log("✓ AUDIT_HEAD audit where clause:", JSON.stringify(auditHeadAuditWhere, null, 2));

  const auditorAuditWhere = buildAuditWhereClause(auditor.id, auditor.role);
  console.log("✓ AUDITOR audit where clause:", JSON.stringify(auditorAuditWhere, null, 2));

  const auditeeAuditWhere = buildAuditWhereClause(auditee.id, auditee.role);
  console.log("✓ AUDITEE audit where clause:", JSON.stringify(auditeeAuditWhere, null, 2));

  // Test 2: getAuditsForUser
  console.log("\n--- Test 2: getAuditsForUser ---");

  const cfoAudits = await getAuditsForUser(cfo.id, cfo.role);
  console.log(`✓ CFO sees ${cfoAudits.length} audits`);

  const auditHeadAudits = await getAuditsForUser(auditHead.id, auditHead.role);
  console.log(`✓ AUDIT_HEAD sees ${auditHeadAudits.length} audits`);

  const auditorAudits = await getAuditsForUser(auditor.id, auditor.role);
  console.log(`✓ AUDITOR sees ${auditorAudits.length} audits`);

  const auditeeAudits = await getAuditsForUser(auditee.id, auditee.role);
  console.log(`✓ AUDITEE sees ${auditeeAudits.length} audits (should be 0)`);

  // Test 3: Test filters on getAuditsForUser
  console.log("\n--- Test 3: getAuditsForUser with filters ---");

  if (cfoAudits.length > 0) {
    const firstAudit = cfoAudits[0];

    // Test plantId filter
    const plantFilteredAudits = await getAuditsForUser(cfo.id, cfo.role, {
      plantId: firstAudit.plantId
    });
    console.log(`✓ plantId filter: ${plantFilteredAudits.length} audits (plantId: ${firstAudit.plantId})`);

    // Test status filter
    const statusFilteredAudits = await getAuditsForUser(cfo.id, cfo.role, {
      status: firstAudit.status
    });
    console.log(`✓ status filter: ${statusFilteredAudits.length} audits (status: ${firstAudit.status})`);

    // Test limit
    const limitedAudits = await getAuditsForUser(cfo.id, cfo.role, { limit: 1 });
    console.log(`✓ limit filter: ${limitedAudits.length} audits (limit: 1)`);
  }

  // Test 4: canAccessAudit
  console.log("\n--- Test 4: canAccessAudit ---");

  if (cfoAudits.length > 0) {
    const testAuditId = cfoAudits[0].id;

    const cfoCanAccess = await canAccessAudit(cfo.id, cfo.role, testAuditId);
    console.log(`✓ CFO can access audit: ${cfoCanAccess} (should be true)`);

    const auditHeadCanAccess = await canAccessAudit(auditHead.id, auditHead.role, testAuditId);
    console.log(`✓ AUDIT_HEAD can access audit: ${auditHeadCanAccess}`);

    const auditorCanAccess = await canAccessAudit(auditor.id, auditor.role, testAuditId);
    console.log(`✓ AUDITOR can access audit: ${auditorCanAccess}`);

    const auditeeCanAccess = await canAccessAudit(auditee.id, auditee.role, testAuditId);
    console.log(`✓ AUDITEE can access audit: ${auditeeCanAccess} (should be false)`);
  }

  // Test 5: Enhanced observation filters
  console.log("\n--- Test 5: Enhanced observation filters ---");

  // Test plantId filter
  const plant = await prisma.plant.findFirst();
  if (plant) {
    const plantFilteredObservations = await getObservationsForUser(cfo.id, cfo.role, {
      plantId: plant.id
    });
    console.log(`✓ plantId filter: ${plantFilteredObservations.length} observations (plantId: ${plant.code})`);
  }

  // Test process filter
  const processFilteredObservations = await getObservationsForUser(cfo.id, cfo.role, {
    process: 'INVENTORY'
  });
  console.log(`✓ process filter: ${processFilteredObservations.length} observations (process: INVENTORY)`);

  // Test published filter
  const publishedObservations = await getObservationsForUser(cfo.id, cfo.role, {
    published: true
  });
  console.log(`✓ published filter: ${publishedObservations.length} observations (published: true)`);

  const unpublishedObservations = await getObservationsForUser(cfo.id, cfo.role, {
    published: false
  });
  console.log(`✓ published filter: ${unpublishedObservations.length} observations (published: false)`);

  // Test searchQuery filter
  const searchResults = await getObservationsForUser(cfo.id, cfo.role, {
    searchQuery: 'inventory'
  });
  console.log(`✓ searchQuery filter: ${searchResults.length} observations (query: 'inventory')`);

  // Test 6: Enhanced getObservationStats
  console.log("\n--- Test 6: Enhanced getObservationStats ---");

  // Test concernedProcess grouping
  const processStats = await getObservationStats(cfo.id, cfo.role, 'concernedProcess');
  console.log(`✓ concernedProcess stats:`, processStats);

  // Test auditId grouping
  const auditStats = await getObservationStats(cfo.id, cfo.role, 'auditId');
  console.log(`✓ auditId stats (first 3):`, auditStats.slice(0, 3));

  // Test existing groupBy options still work
  const approvalStats = await getObservationStats(cfo.id, cfo.role, 'approvalStatus');
  console.log(`✓ approvalStatus stats:`, approvalStats);

  // Test 7: canAccessObservation
  console.log("\n--- Test 7: canAccessObservation ---");

  const observation = await prisma.observation.findFirst();
  if (observation) {
    const cfoObsAccess = await canAccessObservation(cfo.id, cfo.role, observation.id);
    console.log(`✓ CFO can access observation: ${cfoObsAccess} (should be true)`);

    const auditeeObsAccess = await canAccessObservation(auditee.id, auditee.role, observation.id);
    console.log(`✓ AUDITEE can access observation: ${auditeeObsAccess}`);
  }

  console.log("\n=== All tests completed! ===\n");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
