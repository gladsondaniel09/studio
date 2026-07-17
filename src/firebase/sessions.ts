'use client';

import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type { InvestigationContext } from '@/lib/types';

export type SessionDoc = {
  fileName: string;
  uploadedAt: Timestamp;
  rowCount: number;
  logSnippet: string;
  storageRef: string;
};

export type AnalysisOutcome = 'unresolved' | 'fixed' | 'not_applicable';

export type AnalysisDoc = {
  type: 'forensic' | 'replication';
  createdAt: Timestamp;
  context: InvestigationContext;
  resultTitle: string;
  result: unknown;
  outcome?: AnalysisOutcome;
  outcomeNotes?: string;
};

export type SessionDocWithId = SessionDoc & { id: string };
export type AnalysisDocWithId = AnalysisDoc & { id: string };

/**
 * Reserves a Firestore doc ID immediately (synchronous) so the caller can
 * store currentSessionId right away, then kicks off the actual Storage upload
 * + Firestore write in the background.
 */
export function createSessionRef(db: Firestore): {
  sessionId: string;
  saveAsync: (file: File, rowCount: number, logSnippet: string) => Promise<void>;
} {
  const sessionRef = doc(collection(db, 'sessions'));
  const sessionId = sessionRef.id;

  const saveAsync = async (file: File, rowCount: number, logSnippet: string) => {
    const storage = getStorage(getApp());
    const storagePath = `sessions/${sessionId}/${file.name}`;
    await uploadBytes(ref(storage, storagePath), file);
    await setDoc(sessionRef, {
      fileName: file.name,
      uploadedAt: Timestamp.now(),
      rowCount,
      logSnippet,
      storageRef: storagePath,
    } satisfies SessionDoc);
  };

  return { sessionId, saveAsync };
}

export async function saveAnalysis(
  db: Firestore,
  sessionId: string,
  type: 'forensic' | 'replication',
  context: InvestigationContext,
  result: unknown,
): Promise<string> {
  const resultTitle =
    type === 'forensic'
      ? ((result as any)?.title ?? 'Forensic Analysis')
      : ((result as any)?.context_summary ?? 'Replication Script');

  const docRef = await addDoc(collection(db, 'sessions', sessionId, 'analyses'), {
    type,
    createdAt: Timestamp.now(),
    context,
    resultTitle,
    result,
    outcome: 'unresolved',
  } satisfies AnalysisDoc);
  return docRef.id;
}

export async function updateAnalysisOutcome(
  db: Firestore,
  sessionId: string,
  analysisId: string,
  outcome: AnalysisOutcome,
  outcomeNotes?: string,
): Promise<void> {
  await setDoc(
    doc(db, 'sessions', sessionId, 'analyses', analysisId),
    { outcome, ...(outcomeNotes !== undefined ? { outcomeNotes } : {}) },
    { merge: true },
  );
}

export async function deleteSession(
  db: Firestore,
  sessionId: string,
  storageRef: string,
): Promise<void> {
  const storage = getStorage(getApp());
  try {
    await deleteObject(ref(storage, storageRef));
  } catch {
    // File may already be gone; continue
  }
  const analysesSnap = await getDocs(collection(db, 'sessions', sessionId, 'analyses'));
  await Promise.all(analysesSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'sessions', sessionId));
}

export async function getSessionAnalyses(
  db: Firestore,
  sessionId: string,
): Promise<AnalysisDocWithId[]> {
  const snap = await getDocs(
    query(collection(db, 'sessions', sessionId, 'analyses'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ ...(d.data() as AnalysisDoc), id: d.id }));
}

export async function downloadSessionFile(storageRef: string): Promise<ArrayBuffer> {
  // Fetching Storage's ?alt=media endpoint directly from the browser fails with a CORS error —
  // this app's Vercel domain isn't in the bucket's CORS allowlist. Routed through a same-origin
  // API route instead (see src/app/api/session-file/route.ts), which fetches it server-side.
  const response = await fetch(`/api/session-file?path=${encodeURIComponent(storageRef)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to download session file (${response.status})`);
  }
  return response.arrayBuffer();
}
