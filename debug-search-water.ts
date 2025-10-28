/**
 * Debug script to investigate which observations matched "water" search
 */

import { prisma } from '@/server/db';

async function debugSearchWater() {
  console.log('🔍 Investigating observations matching "water" search...\n');

  try {
    // Search using the same logic as the search_observations tool
    // This mirrors the searchQuery filter in buildObservationWhereClause
    const observations = await prisma.observation.findMany({
      where: {
        OR: [
          {
            observationText: {
              contains: 'water',
              mode: 'insensitive'
            }
          },
          {
            risksInvolved: {
              contains: 'water',
              mode: 'insensitive'
            }
          },
          {
            auditeeFeedback: {
              contains: 'water',
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        observationText: true,
        risksInvolved: true,
        auditeeFeedback: true,
        riskCategory: true,
        approvalStatus: true,
        currentStatus: true,
        plant: {
          select: { id: true, name: true }
        },
        audit: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total observations matching "water": ${observations.length}\n`);
    console.log('='.repeat(100));

    observations.forEach((obs, index) => {
      console.log(`\n[${index + 1}] Observation ID: ${obs.id}`);
      console.log(`    Text: ${obs.observationText.substring(0, 80)}${obs.observationText.length > 80 ? '...' : ''}`);
      console.log(`    Risk: ${obs.riskCategory} | Status: ${obs.currentStatus} | Approval: ${obs.approvalStatus}`);

      if (obs.risksInvolved && obs.risksInvolved.toLowerCase().includes('water')) {
        console.log(`    ✓ Matched in risksInvolved: ${obs.risksInvolved.substring(0, 60)}${obs.risksInvolved.length > 60 ? '...' : ''}`);
      }

      if (obs.auditeeFeedback && obs.auditeeFeedback.toLowerCase().includes('water')) {
        console.log(`    ✓ Matched in auditeeFeedback: ${obs.auditeeFeedback.substring(0, 60)}${obs.auditeeFeedback.length > 60 ? '...' : ''}`);
      }

      if (obs.observationText.toLowerCase().includes('water')) {
        console.log(`    ✓ Matched in observationText`);
      }

      console.log(`    Audit: ${obs.audit?.title} | Plant: ${obs.plant?.name}`);
    });

    console.log('\n' + '='.repeat(100));
    console.log('\n✅ Debug complete');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugSearchWater();
