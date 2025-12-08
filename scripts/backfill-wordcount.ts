/**
 * Backfill script for wordCount column.
 * Run after migration: npx tsx scripts/backfill-wordcount.ts
 *
 * This script computes wordCount for all existing screenplays
 * that currently have wordCount = 0.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillWordCount() {
  console.log('🔄 Starting wordCount backfill...\n');

  // Get all screenplays with wordCount = 0 (need backfill)
  const screenplays = await prisma.screenplay.findMany({
    where: { wordCount: 0 },
    select: { id: true, title: true, content: true },
  });

  console.log(`📝 Found ${screenplays.length} screenplays to backfill\n`);

  if (screenplays.length === 0) {
    console.log('✅ All screenplays already have wordCount. Nothing to do.');
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const screenplay of screenplays) {
    try {
      // Compute word count
      const wordCount = screenplay.content
        ? screenplay.content.split(/\s+/).filter(Boolean).length
        : 0;

      // Update the screenplay
      await prisma.screenplay.update({
        where: { id: screenplay.id },
        data: { wordCount },
      });

      updated++;
      console.log(`  ✓ "${screenplay.title}" - ${wordCount} words`);
    } catch (error) {
      errors++;
      console.error(`  ✗ Failed to update "${screenplay.title}":`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${screenplays.length}`);
  console.log('\n✅ Backfill complete!');
}

// Run the backfill
backfillWordCount()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
