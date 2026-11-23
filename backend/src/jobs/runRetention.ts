/**
 * Privacy retention purge (cron / Task Scheduler).
 * Run: npm run jobs:retention
 *
 * Deletes identity and bank private files whose retainUntil has passed,
 * then clears storagePath and sets purgedAt. Safe to re-run.
 */
import { prisma } from "../lib/prisma.js";
import { runRetentionPurge } from "../lib/retentionQueries.js";

const summary = await runRetentionPurge();
console.log("[jobs:retention]", summary);
await prisma.$disconnect();
