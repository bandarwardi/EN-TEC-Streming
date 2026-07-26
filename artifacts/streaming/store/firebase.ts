import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);

export const listenToRemoteKeyboard = (sessionId: string, callback: (text: string) => void) => {
  const sessionRef = ref(database, `sessions/${sessionId}/text`);
  
  onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const text = snapshot.val();
      callback(text);
    }
  });

  // Return an unsubscribe function
  return () => {
    off(sessionRef);
  };
};
