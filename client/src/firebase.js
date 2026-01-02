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

// ============ INVOICE FUNCTIONS ============

// Save an invoice to Firebase
export function saveInvoice(invoice) {
  const invoiceRef = ref(database, `invoices/${invoice.id}`);
  return set(invoiceRef, {
    ...invoice,
    lastUpdated: Date.now()
  });
}

// Update an invoice in Firebase
export function updateInvoice(invoiceId, updates) {
  const invoiceRef = ref(database, `invoices/${invoiceId}`);
  return update(invoiceRef, {
    ...updates,
    lastUpdated: Date.now()
  });
}

// Delete an invoice from Firebase
export function deleteInvoice(invoiceId) {
  const invoiceRef = ref(database, `invoices/${invoiceId}`);
  return remove(invoiceRef);
}

// Listen to all invoices in real-time
export function subscribeToInvoices(callback) {
  const invoicesRef = ref(database, 'invoices');
  return onValue(invoicesRef, (snapshot) => {
    const data = snapshot.val();
    const invoices = data ? Object.values(data) : [];
    callback(invoices);
  });
}

// ============ CONTRACT FUNCTIONS ============

// Save a contract to Firebase
export function saveContract(contract) {
  const contractRef = ref(database, `contracts/${contract.id}`);
  return set(contractRef, {
    ...contract,
    lastUpdated: Date.now()
  });
}

// Update a contract in Firebase
export function updateContract(contractId, updates) {
  const contractRef = ref(database, `contracts/${contractId}`);
  return update(contractRef, {
    ...updates,
    lastUpdated: Date.now()
  });
}

// Delete a contract from Firebase
export function deleteContract(contractId) {
  const contractRef = ref(database, `contracts/${contractId}`);
  return remove(contractRef);
}

// Listen to all contracts in real-time
export function subscribeToContracts(callback) {
  const contractsRef = ref(database, 'contracts');
  return onValue(contractsRef, (snapshot) => {
    const data = snapshot.val();
    const contracts = data ? Object.values(data) : [];
    callback(contracts);
  });
}

// ============ PAYMENT RECORD FUNCTIONS ============

// Save a payment record to Firebase
export function savePaymentRecord(payment) {
  const paymentRef = ref(database, `payments/${payment.id}`);
  return set(paymentRef, {
    ...payment,
    lastUpdated: Date.now()
  });
}

// Listen to all payments in real-time
export function subscribeToPayments(callback) {
  const paymentsRef = ref(database, 'payments');
  return onValue(paymentsRef, (snapshot) => {
    const data = snapshot.val();
    const payments = data ? Object.values(data) : [];
    callback(payments);
  });
}

export { app, database };
