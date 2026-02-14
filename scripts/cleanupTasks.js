#!/usr/bin/env node

/**
 * Firebase Firestore Cleanup Script
 * 
 * Purpose: Remove or update documents that are missing userId or have mismatched ownership
 * Usage: node scripts/cleanupTasks.js
 * 
 * Requirements:
 * - npm install firebase-admin
 * - serviceAccount.json in the project root (download from Firebase Console > Project Settings > Service Accounts)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load service account
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccount.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccount.json not found at:', serviceAccountPath);
  console.error('Download it from Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupTasks() {
  console.log('🧹 Starting Firestore cleanup...\n');

  const collections = ['tasks', 'completedTasks'];
  
  for (const collectionName of collections) {
    console.log(`\n📋 Processing collection: ${collectionName}`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      console.log(`Found ${snapshot.size} documents in ${collectionName}\n`);

      let deletedCount = 0;
      let processedCount = 0;

      for (const doc of snapshot.docs) {
        processedCount++;
        const data = doc.data();
        const docId = doc.id;

        // Check if document has userId
        if (!data.userId) {
          console.log(`⚠️ [${processedCount}] Document "${docId}" - MISSING userId`);
          console.log(`   Data:`, JSON.stringify(data, null, 2));
          console.log(`   Action: DELETE\n`);
          
          // Delete the document
          await db.collection(collectionName).doc(docId).delete();
          deletedCount++;
        } else {
          console.log(`✅ [${processedCount}] Document "${docId}" - Has userId: "${data.userId}"`);
        }
      }

      console.log(`\n📊 ${collectionName} Summary:`);
      console.log(`   Total documents: ${snapshot.size}`);
      console.log(`   Deleted (missing userId): ${deletedCount}`);
      console.log(`   Kept (valid): ${snapshot.size - deletedCount}\n`);

    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error.message);
    }
  }

  console.log('\n✅ Cleanup completed!');
  console.log('\nNext steps:');
  console.log('1. Open Firebase Console and verify documents');
  console.log('2. Test app: create new task and delete it');
  console.log('3. Check browser console for logs');
  console.log('\nIf still seeing permission errors, the remaining documents may be owned by other users.');
  console.log('Manual review in Firebase Console is recommended.');

  process.exit(0);
}

// Run cleanup
cleanupTasks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
