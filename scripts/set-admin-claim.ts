import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

/**
 * SlapEarn Admin Promotion Script
 * 
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <USER_UID_OR_EMAIL>
 * 
 * Example:
 *   npx tsx scripts/set-admin-claim.ts user@example.com
 *   npx tsx scripts/set-admin-claim.ts vh1N28xL98asdf...
 */

function getProjectId(): string {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.projectId) return parsed.projectId;
    }
  } catch {}
  return process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'slapearn';
}

async function setAdminClaim() {
  const target = process.argv[2]?.trim();

  if (!target) {
    console.error('❌ Error: Missing user UID or Email argument.');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/set-admin-claim.ts <USER_UID_OR_EMAIL>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/set-admin-claim.ts justinkatempa19@gmail.com');
    process.exit(1);
  }

  const projectId = getProjectId();
  console.log(`🔧 Connecting to Firebase Admin for project: "${projectId}"...`);

  const app = getApps().length === 0
    ? initializeApp({ projectId })
    : getApps()[0];

  const auth = getAuth(app);

  let userRecord;
  try {
    if (target.includes('@')) {
      console.log(`🔍 Looking up user by email: ${target}...`);
      userRecord = await auth.getUserByEmail(target);
    } else {
      console.log(`🔍 Looking up user by UID: ${target}...`);
      userRecord = await auth.getUser(target);
    }
  } catch (lookupErr: any) {
    console.error(`❌ User lookup failed for "${target}":`, lookupErr.message || lookupErr);
    process.exit(1);
  }

  console.log(`✅ Found user:`);
  console.log(`   - UID: ${userRecord.uid}`);
  console.log(`   - Email: ${userRecord.email || 'N/A'}`);
  console.log(`   - Display Name: ${userRecord.displayName || 'N/A'}`);
  console.log(`   - Current Custom Claims:`, userRecord.customClaims || {});

  console.log(`\n🔐 Setting Firebase Custom Claim: { admin: true }...`);
  await auth.setCustomUserClaims(userRecord.uid, {
    ...(userRecord.customClaims || {}),
    admin: true,
  });

  const updatedRecord = await auth.getUser(userRecord.uid);
  console.log(`\n🎉 SUCCESS! Admin claim granted:`);
  console.log(`   - UID: ${updatedRecord.uid}`);
  console.log(`   - Updated Claims:`, updatedRecord.customClaims);
  console.log(`\n💡 Note: The user should sign out and sign back in (or refresh their ID token with auth.currentUser.getIdToken(true)) for the new claim to take effect in the browser.`);
}

setAdminClaim().catch((err) => {
  console.error('Fatal error setting admin claim:', err);
  process.exit(1);
});
