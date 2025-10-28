/**
 * Verify all observations in database
 */

import { prisma } from '@/server/db';

async function verifyAllObservations() {
  console.log('📊 Total observations in database:\n');

  try {
    // Get total count
    const total = await prisma.observation.count();
    console.log(`Total observations: ${total}\n`);

    // Get breakdown by approval status
    const byApproval = await prisma.observation.groupBy({
      by: ['approvalStatus'],
      _count: { _all: true }
    });

    console.log('By Approval Status:');
    byApproval.forEach(row => {
      console.log(`  ${row.approvalStatus}: ${row._count._all}`);
    });

    console.log('\nObservations with "water" case-insensitive search:');
    const waterObs = await prisma.observation.findMany({
      where: {
        OR: [
          { observationText: { contains: 'water', mode: 'insensitive' } },
          { risksInvolved: { contains: 'water', mode: 'insensitive' } },
          { auditeeFeedback: { contains: 'water', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        observationText: true,
        approvalStatus: true,
        createdAt: true
      }
    });

    console.log(`Found ${waterObs.length} observations with "water":`);
    waterObs.forEach((obs, idx) => {
      console.log(`\n[${idx + 1}] ID: ${obs.id}`);
      console.log(`    Text: ${obs.observationText.substring(0, 80)}`);
      console.log(`    Status: ${obs.approvalStatus}`);
      console.log(`    Created: ${obs.createdAt.toISOString()}`);
    });

    // Check for observations with ID patterns that might suggest test data
    const testObs = await prisma.observation.findMany({
      where: {
        OR: [
          { id: { contains: 'phase2', mode: 'insensitive' } },
          { id: { contains: 'test', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        observationText: true
      },
      take: 20
    });

    console.log(`\n\nTest/Phase2 observations found: ${testObs.length}`);
    if (testObs.length > 0) {
      console.log('First 5:');
      testObs.slice(0, 5).forEach(obs => {
        console.log(`  ${obs.id}: "${obs.observationText.substring(0, 50)}..."`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllObservations();
