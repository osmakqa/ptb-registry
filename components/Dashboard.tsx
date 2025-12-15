import React, { useState, useEffect, useMemo } from 'react';
import { Patient, DashboardStats, DiagnosticRecord } from '../types';
import { getPatients, updateFinalDisposition } from '../services/dataService';
import StatCard from './StatCard';
import { Activity, Users, FileText, UserMinus, Filter, Edit, Search, AlertCircle, XCircle, X } from 'lucide-react';
import { WARDS, OUTCOMES } from '../constants';
import PatientRegistration from './PatientRegistration';

interface DashboardProps {
    onEdit?: (id: string) => void;
}

const getPatientAge = (p: Patient) => {
    if (p.age !== undefined && p.age !== null) {
        return p.age;
    }
    if (!p.dob) return '';
    const birthDate = new Date(p.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Helper: Get latest diagnostic result
const getLatestDiagnostic = (history: DiagnosticRecord[] | undefined) => {
    if (!history || history.length === 0) return { date: '', result: 'Pending' };
    // Assuming the order is preserved (pushed to end), latest is last. 
    // If we want by date, we can sort, but simple pop is often enough if added chronologically.
    // Let's sort by date just in case.
    const sorted = [...history].sort((a, b) => {
        if(!a.date) return 1;
        if(!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return sorted[0]; // Newest first
};

// Helper to check for missing fields
const getMissingEntriesList = (p: Patient): string[] => {
    const missing = [];
    const latestXpert = getLatestDiagnostic(p.xpertHistory).result;
    const latestSmear = getLatestDiagnostic(p.smearHistory).result;

    if (latestXpert === 'Pending') missing.push('Xpert Result');
    if (latestSmear === 'Pending') missing.push('Smear Result');
    if (p.hivTestResult === 'Unknown' || p.hivTestResult === 'Pending') missing.push('HIV Status');
    if (p.drugSusceptibility === 'Unknown') missing.push('Drug Susc.');
    if (!p.finalDisposition && ['Discharged', 'Expired', 'Transferred out', 'Lost to follow-up'].includes(p.initialDisposition)) missing.push('Final Disposition');
    if (p.bacteriologicalStatus === 'Pending') missing.push('Classification');
    return missing;
};

const Dashboard: React.FC<DashboardProps> = ({ onEdit }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Command Center Filters
  const [filterWard, setFilterWard] = useState<string>('All');
  const [filterOutcome, setFilterOutcome] = useState<string>('Active Cases'); // Custom filter logic
  const [filterBact, setFilterBact] = useState<string>('All');

  // Stat Card Selection Filter
  const [selectedStatFilter, setSelectedStatFilter] = useState<string | null>(null);

  // Modal State for Disposition
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newOutcome, setNewOutcome] = useState<string>('');
  const [newOutcomeDate, setNewOutcomeDate] = useState<string>('');

  // Detail Modal
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getPatients();
    setPatients(data);
    setLoading(false);
  };

  const isActive = (p: Patient) => {
      // Use finalDisposition if available, otherwise fallback to initialDisposition
      const status = p.finalDisposition || p.initialDisposition;
      return status === 'Admitted' || status === 'ER-level';
  };

  const stats: DashboardStats = useMemo(() => {
    const active = patients.filter(isActive);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Inactive but with missing entries
    const inactiveMissing = patients.filter(p => !isActive(p) && getMissingEntriesList(p).length > 0).length;

    return {
      totalActive: active.length,
      admitted: active.filter(p => (p.finalDisposition || p.initialDisposition) === 'Admitted').length,
      erLevel: active.filter(p => (p.finalDisposition || p.initialDisposition) === 'ER-level').length,
      dischargedThisMonth: patients.filter(p => p.finalDisposition === 'Discharged' && p.finalDispositionDate && new Date(p.finalDispositionDate) >= startOfMonth).length,
      expiredThisMonth: patients.filter(p => p.finalDisposition === 'Expired' && p.finalDispositionDate && new Date(p.finalDispositionDate) >= startOfMonth).length,
      pendingLabs: active.filter(p => {
          const x = getLatestDiagnostic(p.xpertHistory).result;
          const s = getLatestDiagnostic(p.smearHistory).result;
          return x === 'Pending' || s === 'Pending';
      }).length,
      inactiveMissing
    };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
        const matchesSearch = `${p.lastName} ${p.firstName} ${p.id} ${p.hospitalNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWard = filterWard === 'All' || p.areaWard === filterWard;
        const matchesBact = filterBact === 'All' || p.bacteriologicalStatus === filterBact;
        
        let matchesOutcome = true;
        if (filterOutcome === 'Active Cases') {
            matchesOutcome = isActive(p);
        } else if (filterOutcome !== 'All') {
            matchesOutcome = p.finalDisposition === filterOutcome;
        }

        // Apply Stat Card Filter if active
        let matchesStat = true;
        if (selectedStatFilter === 'totalActive') matchesStat = isActive(p);
        if (selectedStatFilter === 'admitted') matchesStat = (p.finalDisposition || p.initialDisposition) === 'Admitted';
        if (selectedStatFilter === 'erLevel') matchesStat = (p.finalDisposition || p.initialDisposition) === 'ER-level';
        if (selectedStatFilter === 'pendingLabs') {
             const x = getLatestDiagnostic(p.xpertHistory).result;
             const s = getLatestDiagnostic(p.smearHistory).result;
             matchesStat = isActive(p) && (x === 'Pending' || s === 'Pending');
        }
        if (selectedStatFilter === 'inactiveMissing') matchesStat = !isActive(p) && getMissingEntriesList(p).length > 0;

        return matchesSearch && matchesWard && matchesBact && matchesOutcome && matchesStat;
    });
  }, [patients, searchTerm, filterWard, filterBact, filterOutcome, selectedStatFilter]);

  const handleUpdateDisposition = async () => {
      if(selectedPatientId && newOutcome) {
          await updateFinalDisposition(selectedPatientId, newOutcome as any, newOutcomeDate);
          setSelectedPatientId(null);
          loadData(); // Refresh
      }
  }

  const clearFilters = () => {
      setFilterWard('All');
      setFilterOutcome('Active Cases');
      setFilterBact('All');
      setSearchTerm('');
      setSelectedStatFilter(null);
  }

  // Helper to render fields with missing highlights
  const DetailField = ({ label, value, isMissing, fullWidth = false }: { label: string, value: any, isMissing?: boolean, fullWidth?: boolean }) => (
      <div className={`p-2 rounded ${isMissing ? 'bg-red-50 border border-red-200' : ''} ${fullWidth ? 'col-span-2 md:col-span-3' : ''}`}>
          <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
          <div className={`text-sm ${isMissing ? 'text-red-700 font-bold' : 'text-gray-900'}`}>
              {value || <span className="text-gray-400 italic">--</span>}
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Stats Row - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
            title="Total Active" 
            value={stats.totalActive} 
            icon={<Activity />} 
            onClick={() => setSelectedStatFilter('totalActive')}
            isActive={selectedStatFilter === 'totalActive'}
        />
        <StatCard 
            title="Admitted" 
            value={stats.admitted} 
            icon={<Users />} 
            color="bg-blue-50 border-blue-200"
            onClick={() => setSelectedStatFilter('admitted')}
            isActive={selectedStatFilter === 'admitted'}
        />
        <StatCard 
            title="ER Pending" 
            value={stats.erLevel} 
            icon={<FileText />} 
            color="bg-orange-50 border-orange-200"
            onClick={() => setSelectedStatFilter('erLevel')}
            isActive={selectedStatFilter === 'erLevel'}
        />
        <StatCard 
            title="Pending Labs" 
            value={stats.pendingLabs} 
            icon={<AlertCircle />} 
            color="bg-yellow-50 border-yellow-200"
            onClick={() => setSelectedStatFilter('pendingLabs')}
            isActive={selectedStatFilter === 'pendingLabs'}
        />
        <StatCard 
            title="Inactive (Missing)" 
            value={stats.inactiveMissing} 
            icon={<UserMinus />} 
            color="bg-red-50 border-red-200"
            onClick={() => setSelectedStatFilter('inactiveMissing')}
            isActive={selectedStatFilter === 'inactiveMissing'}
        />
      </div>

      {/* 2. Command Center (Filters) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-3">
             <div className="relative flex-[2]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search Name or Hosp #" 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-osmak-green focus:outline-none focus:border-transparent transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             
             <select 
                className="flex-1 py-2.5 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none focus:border-transparent cursor-pointer" 
                value={filterWard} 
                onChange={e => setFilterWard(e.target.value)}
            >
                <option value="All">All Wards</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>

            <select 
                className="flex-1 py-2.5 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none focus:border-transparent cursor-pointer" 
                value={filterOutcome} 
                onChange={e => setFilterOutcome(e.target.value)}
            >
                <option value="All">All Statuses</option>
                <option value="Active Cases">Active (Admitted/ER)</option>
                <option value="Discharged">Discharged</option>
                <option value="Expired">Expired</option>
            </select>
             
             <select 
                className="flex-1 py-2.5 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none focus:border-transparent cursor-pointer" 
                value={filterBact} 
                onChange={e => setFilterBact(e.target.value)}
            >
                <option value="All">All Classifications</option>
                <option value="Bacteriological">Bacteriological Confirmed</option>
                <option value="Clinical">Clinically Diagnosed</option>
                <option value="Presumptive">Presumptive TB</option>
            </select>

            <button 
                onClick={clearFilters} 
                title="Clear Filters" 
                className="flex-none p-2.5 text-gray-500 hover:text-osmak-red hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
            >
                <XCircle size={20} />
            </button>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-xs border-b">
                    <tr>
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Admission</th>
                        <th className="px-6 py-4">Status / Ward</th>
                        <th className="px-6 py-4">Labs (Xpert/Smear)</th>
                        <th className="px-6 py-4">Missing Entries</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading registry...</td></tr>
                    ) : filteredPatients.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">No records found.</td></tr>
                    ) : (
                        filteredPatients.map(patient => {
                            const missingList = getMissingEntriesList(patient);
                            const missing = missingList.length > 0 ? missingList.join(', ') : null;
                            const latestXpert = getLatestDiagnostic(patient.xpertHistory);
                            const latestSmear = getLatestDiagnostic(patient.smearHistory);
                            
                            return (
                                <tr 
                                    key={patient.id} 
                                    onClick={() => { setDetailPatient(patient); setIsEditing(false); }}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{patient.lastName}, {patient.firstName}</div>
                                        <div className="text-xs text-gray-500 flex flex-col">
                                            <span>{patient.sex} • {getPatientAge(patient)}</span>
                                            <span className="text-gray-400">Hosp#: {patient.hospitalNumber || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900">{patient.dateOfAdmission}</div>
                                        <div className="text-xs text-gray-500">{patient.bacteriologicalStatus}</div>
                                        <div className="text-xs text-osmak-green font-medium">{patient.doctorInCharge}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${patient.finalDisposition === 'Admitted' ? 'bg-green-100 text-green-800' : 
                                            patient.finalDisposition === 'Expired' ? 'bg-gray-100 text-gray-800' :
                                            patient.finalDisposition === 'Discharged' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {patient.finalDisposition || 'Pending'}
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">{patient.areaWard}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs">
                                                <span className="font-semibold text-gray-500">X:</span> 
                                                <span className={latestXpert.result === 'Positive' ? 'text-red-600 font-bold ml-1' : 'ml-1'}>{latestXpert.result}</span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="font-semibold text-gray-500">S:</span>
                                                <span className={latestSmear.result === 'Positive' ? 'text-red-600 font-bold ml-1' : 'ml-1'}>{latestSmear.result}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {missing ? (
                                            <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">
                                                {missingList.length} Missing
                                            </span>
                                        ) : (
                                            <span className="text-xs text-green-600 font-medium">Complete</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedPatientId(patient.id); }}
                                            className="text-osmak-green hover:bg-osmak-green/10 p-2 rounded transition-colors text-xs font-medium mr-2">
                                            Disposition
                                        </button>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Detail Modal / Edit Modal */}
      {detailPatient && (
          <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 animate-fadeIn">
              {isEditing ? (
                  // Edit Mode: Re-use Registration Component
                  <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                      <PatientRegistration 
                        initialData={detailPatient} 
                        onSuccess={() => { setDetailPatient(null); loadData(); }} 
                        onCancel={() => { setIsEditing(false); }}
                      />
                  </div>
              ) : (
                  // View Mode
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                      <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-bold text-gray-900">{detailPatient.lastName}, {detailPatient.firstName}</h2>
                              <p className="text-sm text-gray-500">
                                  Hosp#: {detailPatient.hospitalNumber} • {detailPatient.sex} • {getPatientAge(detailPatient)} y/o
                              </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                <Edit size={16} /> Edit Entries
                            </button>
                            <button onClick={() => setDetailPatient(null)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={24} className="text-gray-500" />
                            </button>
                          </div>
                      </div>
                      
                      <div className="p-6 space-y-6">
                            {/* Status Check */}
                            {getMissingEntriesList(detailPatient).length > 0 && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                    <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2">
                                        <AlertCircle size={16}/> Missing Information
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-red-700">
                                        {getMissingEntriesList(detailPatient).map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                            )}

                            <section>
                                <h3 className="text-sm font-bold text-osmak-green uppercase border-b pb-1 mb-3">Admission & Location</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <DetailField label="Date Admitted" value={detailPatient.dateOfAdmission} />
                                    <DetailField label="Ward" value={detailPatient.areaWard} />
                                    <DetailField label="Doctor" value={detailPatient.doctorInCharge} />
                                    <DetailField label="Disposition" value={detailPatient.initialDisposition} />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-osmak-green uppercase border-b pb-1 mb-3">Clinical Data</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <DetailField label="Xpert (Latest)" value={getLatestDiagnostic(detailPatient.xpertHistory).result} isMissing={getLatestDiagnostic(detailPatient.xpertHistory).result === 'Pending'} />
                                    <DetailField label="Smear (Latest)" value={getLatestDiagnostic(detailPatient.smearHistory).result} isMissing={getLatestDiagnostic(detailPatient.smearHistory).result === 'Pending'} />
                                    <DetailField label="HIV" value={detailPatient.hivTestResult} isMissing={detailPatient.hivTestResult === 'Unknown' || detailPatient.hivTestResult === 'Pending'} />
                                    <DetailField label="Anatomical" value={detailPatient.anatomicalSite} />
                                    <DetailField label="Drug Susc." value={detailPatient.drugSusceptibility} isMissing={detailPatient.drugSusceptibility === 'Unknown'} />
                                    <DetailField label="Class" value={detailPatient.bacteriologicalStatus} />
                                </div>
                            </section>
                            
                            <section>
                                <h3 className="text-sm font-bold text-osmak-green uppercase border-b pb-1 mb-3">Treatment & Disposition</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <DetailField label="Tx Started" value={detailPatient.treatmentStarted ? 'Yes' : 'No'} />
                                    <DetailField label="Tx Start Date" value={detailPatient.treatmentStartDate} />
                                    <DetailField label="History" value={detailPatient.treatmentHistory} />
                                    <DetailField label="Regimen" value={detailPatient.treatmentRegimen} fullWidth />
                                    {detailPatient.treatmentRegimenNotes && (
                                        <DetailField label="Regimen Notes" value={detailPatient.treatmentRegimenNotes} fullWidth />
                                    )}
                                    <DetailField label="Final Disp." value={detailPatient.finalDisposition} />
                                    <DetailField label="Disp. Date" value={detailPatient.finalDispositionDate} />
                                </div>
                            </section>
                      </div>

                      <div className="p-4 border-t bg-gray-50 flex justify-end">
                          <button 
                            onClick={() => { setDetailPatient(null); setSelectedPatientId(detailPatient.id); }}
                            className="bg-osmak-green text-white px-4 py-2 rounded font-medium text-sm hover:bg-osmak-green-dark">
                            Quick Disposition Update
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Disposition Modal */}
      {selectedPatientId && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold mb-4">Update Disposition</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm font-medium mb-1 block">New Status</label>
                          <select className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none" 
                            value={newOutcome} onChange={e => setNewOutcome(e.target.value)}>
                              <option value="">Select Outcome</option>
                              {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                      </div>
                      {(newOutcome === 'Discharged' || newOutcome === 'Expired' || newOutcome === 'Transferred out') && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Date</label>
                            <input type="date" className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none"
                                value={newOutcomeDate} onChange={e => setNewOutcomeDate(e.target.value)} />
                          </div>
                      )}
                      <div className="flex gap-2 justify-end mt-6">
                          <button onClick={() => setSelectedPatientId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                          <button onClick={handleUpdateDisposition} className="px-4 py-2 bg-osmak-green text-white rounded hover:bg-osmak-green-dark">Save Update</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;