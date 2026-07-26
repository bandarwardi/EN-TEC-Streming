import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Helper function to update the text in Firebase
export const updateSessionText = (sessionId: string, text: string) => {
  const sessionRef = ref(database, `sessions/${sessionId}`);
  set(sessionRef, {
    text,
    timestamp: Date.now()
  });
};
