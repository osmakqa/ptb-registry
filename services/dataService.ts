import { Patient } from '../types';

// ==============================================================================
// PASTE YOUR APPS SCRIPT WEB APP URL HERE
// ==============================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbw9Y6FLP7juMZA3dj646K3VUNL0dqRnazXSytSj6vVj2sS99zXjnPcx-XZH6nYB2p3j/exec'; 

const CACHE_KEY = 'osmak_ptb_registry_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEnvelope {
  timestamp: number;
  data: Patient[];
}

export const getPatients = async (): Promise<Patient[]> => {
  try {
    // 1. Try to serve from Cache
    const cachedString = localStorage.getItem(CACHE_KEY);
    if (cachedString) {
      try {
        const envelope: CacheEnvelope = JSON.parse(cachedString);
        const age = Date.now() - envelope.timestamp;
        
        if (age < CACHE_DURATION) {
          // console.log("Serving patients from cache");
          return envelope.data;
        }
      } catch (e) {
        console.warn("Invalid cache format, clearing.", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }

    // 2. Fetch from Network if cache miss or expired
    const response = await fetch(API_URL);
    const result = await response.json();
    
    let processedData: Patient[] = [];
    if (result.status === 'success') {
      processedData = result.data.map((p: any) => ({
        ...p,
        // Ensure arrays are initialized if empty in DB
        comorbidities: p.comorbidities || { diabetes: false, substanceAbuse: false, liverDisease: false, renalDisease: false, others: '' },
        xpertHistory: Array.isArray(p.xpertHistory) ? p.xpertHistory : [],
        smearHistory: Array.isArray(p.smearHistory) ? p.smearHistory : [],
        // Ensure booleans are actual booleans (Sheets might return strings "TRUE"/"FALSE" or "true"/"false")
        treatmentStarted: p.treatmentStarted === true || p.treatmentStarted === 'true' || p.treatmentStarted === 'TRUE',
        startedOnArt: p.startedOnArt === true || p.startedOnArt === 'true' || p.startedOnArt === 'TRUE',
        // Fallback for finalDisposition if empty (common for newly registered active patients)
        finalDisposition: p.finalDisposition || p.initialDisposition
      }));
    }

    // 3. Save to Cache
    const envelope: CacheEnvelope = {
      timestamp: Date.now(),
      data: processedData
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));

    return processedData;

  } catch (error) {
    console.error("Error fetching patients:", error);
    // Optional: could return stale cache here if network fails, but standard behavior is empty array
    return [];
  }
};

export const savePatient = async (patient: Patient): Promise<void> => {
  try {
    // Generate ID if new
    if (!patient.id) {
        patient.id = Math.random().toString(36).substr(2, 9);
        patient.createdAt = new Date().toISOString();
        patient.status = 'Active';
    }
    
    // Ensure histories are arrays
    patient.xpertHistory = patient.xpertHistory || [];
    patient.smearHistory = patient.smearHistory || [];

    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'save', patient }),
    });

    // Invalidate Cache so next fetch gets fresh data
    localStorage.removeItem(CACHE_KEY);

  } catch (error) {
    console.error("Error saving patient:", error);
    throw error;
  }
};

export const updateFinalDisposition = async (id: string, disposition: Patient['finalDisposition'], date?: string): Promise<void> => {
  try {
    const updates: any = { finalDisposition: disposition };
    if (date) updates.finalDispositionDate = date;

    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'patch', id, updates }),
    });

    // Invalidate Cache so next fetch gets fresh data
    localStorage.removeItem(CACHE_KEY);

  } catch (error) {
    console.error("Error updating disposition:", error);
    throw error;
  }
};