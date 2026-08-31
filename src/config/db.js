/**
 * EduBoard Backend Database Repository Adapter (Firebase Firestore Mode)
 *
 * This module replaces the SQL/Localstorage adapter with Firebase Firestore.
 * It provides a query(sql, params) interface that translates basic SQL operations
 * to Firestore calls, allowing existing API routes to work with Firebase.
 */

const admin = require('firebase-admin');
const path = require('path');

const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    let serviceAccount = null;
    const candidates = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.resolve(__dirname, '../../apps/api/serviceAccountKey.json'),
      path.resolve(__dirname, '../apps/api/serviceAccountKey.json'),
      path.resolve(__dirname, './serviceAccountKey.json'),
      path.resolve(process.cwd(), 'apps/api/serviceAccountKey.json'),
      path.resolve(process.cwd(), 'serviceAccountKey.json')
    ].filter(Boolean);

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          serviceAccount = require(p);
          console.log(`[Firebase Admin] Successfully loaded service account credentials from: ${p}`);
          break;
        } catch (e) {
          console.warn(`[Firebase Admin] Failed to parse service account at ${p}:`, e.message);
        }
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'eduboard-6fdcc'
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}


const db = admin.firestore();

async function testConnection() {
  try {
    await db.listCollections();
    return true;
  } catch {
    return false;
  }
}

/**
 * Universal SQL-to-Firestore Abstraction Layer
 * Supports basic SELECT, INSERT, UPDATE, DELETE patterns used in routes.
 */
async function query(sql, params = []) {
  const cleanSql = sql.trim();
  const op = cleanSql.split(' ')[0].toUpperCase();

  // Extract table name (Collection name)
  const tableMatch = cleanSql.match(/FROM\s+`?(\w+)`?/i) ||
                     cleanSql.match(/INTO\s+`?(\w+)`?/i) ||
                     cleanSql.match(/UPDATE\s+`?(\w+)`?/i) ||
                     cleanSql.match(/DELETE\s+FROM\s+`?(\w+)`?/i);

  const collectionName = tableMatch ? tableMatch[1] : 'default';
  const collection = db.collection(collectionName);

  try {
    if (op === 'SELECT') {
      // Very basic SELECT parser
      let firestoreQuery = collection;

      // Handle COUNT
      if (cleanSql.includes('COUNT')) {
        const snapshot = await collection.get();
        return [{ total: snapshot.size, count: snapshot.size }];
      }

      // Handle WHERE (simple equality only)
      const whereMatch = cleanSql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|GROUP|$)/is);
      if (whereMatch) {
        const conditions = whereMatch[1];
        const matches = [...conditions.matchAll(/`?(\w+)`?\s*=\s*\?/g)];
        matches.forEach((match, index) => {
          const col = match[1];
          const val = params[index];
          if (val !== undefined) {
            firestoreQuery = firestoreQuery.where(col, '==', val);
          }
        });
      }

      // Handle ORDER BY (multiple columns support)
      const orderMatch = cleanSql.match(/ORDER BY\s+(.+?)(?:LIMIT|OFFSET|$)/i);
      if (orderMatch) {
        const orderings = orderMatch[1].split(',');
        orderings.forEach(order => {
          const [rawCol, rawDir] = order.trim().split(/\s+/);
          const col = rawCol.replace(/^(?:w|s|wc)\./, '').replace(/`/g, '').trim();
          const dir = (rawDir || 'ASC').toUpperCase() === 'DESC' ? 'desc' : 'asc';
          firestoreQuery = firestoreQuery.orderBy(col, dir);
        });
      }

      // Handle LIMIT
      const limitMatch = cleanSql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        firestoreQuery = firestoreQuery.limit(parseInt(limitMatch[1]));
      }

      const snapshot = await firestoreQuery.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } else if (op === 'INSERT') {
      const colsMatch = cleanSql.match(/\(([^)]+)\)/);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        const newRow = {};
        cols.forEach((c, i) => { if (params[i] !== undefined) newRow[c] = params[i]; });

        const id = newRow.id || params[0];
        delete newRow.id;

        // Handle ON DUPLICATE KEY UPDATE by doing a set with merge
        if (id && cleanSql.includes('ON DUPLICATE KEY UPDATE')) {
          await collection.doc(id).set({
            ...newRow,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          return { insertId: id, affectedRows: 1 };
        }

        if (id) {
          await collection.doc(id).set({
            ...newRow,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return { insertId: id, affectedRows: 1 };
        } else {
          const docRef = await collection.add({
            ...newRow,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return { insertId: docRef.id, affectedRows: 1 };
        }
      }

    } else if (op === 'UPDATE') {
      const setMatch = cleanSql.match(/SET\s+(.+?)(?:WHERE|$)/is);
      const whereIdMatch = cleanSql.match(/WHERE\s+`?(id|whiteboard_id|user_id)`?\s*=\s*\?/i);

      if (setMatch && whereIdMatch) {
        const sets = setMatch[1].split(',').map(s => s.trim().split('=')[0].trim().replace(/`/g, ''));
        const updateData = {};
        sets.forEach((col, i) => { if (params[i] !== undefined) updateData[col] = params[i]; });
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        const field = whereIdMatch[1];
        const val = params[params.length - 1];

        if (field === 'id') {
          await collection.doc(val).update(updateData);
          return { affectedRows: 1 };
        } else {
          const snapshot = await collection.where(field, '==', val).get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.update(doc.ref, updateData));
          await batch.commit();
          return { affectedRows: snapshot.size };
        }
      }

    } else if (op === 'DELETE') {
      const whereMatch = cleanSql.match(/WHERE\s+`?(id|whiteboard_id)`?\s*=\s*\?/i);
      if (whereMatch && params[0]) {
        const field = whereMatch[1];
        const val = params[0];

        if (field === 'id') {
          await collection.doc(val).delete();
          return { affectedRows: 1 };
        } else {
          // Bulk delete (e.g., shapes for a board)
          const snapshot = await collection.where(field, '==', val).get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          return { affectedRows: snapshot.size };
        }
      }
    }

    return [];
  } catch (error) {
    console.error(`Firestore query error (${op}):`, error);
    throw error;
  }
}

module.exports = { db, testConnection, query };
