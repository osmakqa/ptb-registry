export type LabResult = 'Positive' | 'Negative' | 'Pending' | 'Not Done' | 'Trace' | 'Indeterminate';
export type BacteriologicalStatus = 'Bacteriological' | 'Clinical' | 'Pending';
export type AnatomicalSite = 'Pulmonary' | 'Extra-pulmonary';
export type DrugSusceptibility = 'Drug-susceptible' | 'Drug Resistant' | 'Unknown';
export type TreatmentHistory = 'New' | 'Retreatment';
export type Outcome = 'ER-level' | 'Admitted' | 'Discharged' | 'Expired' | 'Transferred out' | 'Lost to follow-up' | '';
export type InitialDisposition = 'ER-level' | 'Admitted' | 'Discharged' | 'Expired' | 'Transferred' | 'HAMA';
export type CivilStatus = 'Single' | 'Married' | 'Widowed' | 'Separated';

export interface Comorbidities {
  diabetes: boolean;
  substanceAbuse: boolean;
  liverDisease: boolean;
  renalDisease: boolean;
  others: string; // Comma separated if multiple
}

export interface DiagnosticRecord {
  id?: string;
  date: string;
  result: LabResult;
}

export interface Patient {
  id: string;
  hospitalNumber: string;
  // Demographics
  lastName: string;
  firstName: string;
  dob: string;
  sex: 'Male' | 'Female';
  civilStatus: CivilStatus;
  brgy: string;
  city: string;

  // Admission
  dateOfAdmission: string;
  areaWard: string;
  doctorInCharge: string;
  initialDisposition: InitialDisposition;

  // Diagnostics (History)
  xpertHistory: DiagnosticRecord[];
  smearHistory: DiagnosticRecord[];
  
  // Classification
  bacteriologicalStatus: BacteriologicalStatus;
  anatomicalSite: AnatomicalSite;
  extraPulmonarySite?: string; // Only if AnatomicalSite is Extra-pulmonary
  drugSusceptibility: DrugSusceptibility;
  treatmentHistory: TreatmentHistory;

  // Treatment
  treatmentStarted: boolean;
  treatmentStartDate?: string;
  treatmentRegimen?: string;
  treatmentRegimenNotes?: string; // For specifying sub-types (a,b,c) or ITR details

  // Comorbidities & HIV
  comorbidities: Comorbidities;
  hivTestResult: 'Positive' | 'Negative' | 'Unknown' | 'Pending';
  startedOnArt: boolean;

  // Outcome (Final Disposition)
  finalDisposition: Outcome;
  finalDispositionDate?: string;
  
  // Metadata
  status: 'Active' | 'Archived'; 
  createdAt: string;
}

export interface DashboardStats {
  totalActive: number;
  admitted: number;
  erLevel: number;
  dischargedThisMonth: number;
  expiredThisMonth: number;
  pendingLabs: number;
  inactiveMissing: number;
}