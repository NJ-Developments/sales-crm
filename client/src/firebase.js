import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBX-0OeGX28Fw6gLbduHVE4I8sHXTk9iBg",
  authDomain: "njdevelopmentsales.firebaseapp.com",
  databaseURL: "https://njdevelopmentsales-default-rtdb.firebaseio.com",
  projectId: "njdevelopmentsales",
  storageBucket: "njdevelopmentsales.firebasestorage.app",
  messagingSenderId: "460169087644",
  appId: "1:460169087644:web:3630971faae870eb6d3b59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Check if Firebase is configured (always true with hardcoded config)
export function isFirebaseConfigured() {
  return true;
}

// Initialize Firebase (no-op since already initialized)
export function initFirebase() {
  return { app, database };
}

// Save a lead to Firebase
export function saveLead(lead) {
  const leadRef = ref(database, `leads/${lead.id}`);
  return set(leadRef, {
    ...lead,
    lastUpdated: Date.now()
  });
}

// Update a lead in Firebase
export function updateFirebaseLead(leadId, updates) {
  const leadRef = ref(database, `leads/${leadId}`);
  return update(leadRef, {
    ...updates,
    lastUpdated: Date.now()
  });
}

// Delete a lead from Firebase
export function deleteLead(leadId) {
  const leadRef = ref(database, `leads/${leadId}`);
  return remove(leadRef);
}

// Listen to all leads in real-time
export function subscribeToLeads(callback) {
  const leadsRef = ref(database, 'leads');
  return onValue(leadsRef, (snapshot) => {
    const data = snapshot.val();
    const leads = data ? Object.values(data) : [];
    callback(leads);
  });
}

export { app, database };
