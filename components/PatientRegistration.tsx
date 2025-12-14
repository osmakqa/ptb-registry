import React, { useState, useEffect } from 'react';
import { Patient, Comorbidities, DiagnosticRecord, LabResult } from '../types';
import { WARDS, BARANGAYS, LAB_RESULTS, OUTCOMES, EMBO_BARANGAYS, TREATMENT_REGIMENS } from '../constants';
import { Save, AlertCircle, X, Plus, Trash2, History } from 'lucide-react';
import { savePatient } from '../services/dataService';

interface PatientRegistrationProps {
  onSuccess: () => void;
  initialData?: Patient | null;
  onCancel?: () => void;
}

// Custom Disposition options as requested
const DISPOSITION_OPTIONS = ['ER-level', 'Admitted', 'Discharged', 'Expired', 'Transferred'];

const initialPatientState: Partial<Patient> = {
  hospitalNumber: '',
  sex: 'Male',
  civilStatus: 'Single',
  brgy: '',
  city: 'Makati',
  
  // History Arrays
  xpertHistory: [],
  smearHistory: [],
  
  bacteriologicalStatus: 'Clinical',
  anatomicalSite: 'Pulmonary',
  drugSusceptibility: 'Unknown',
  treatmentHistory: 'New',
  treatmentStarted: false,
  treatmentRegimen: '',
  treatmentRegimenNotes: '',
  comorbidities: {
    diabetes: false,
    substanceAbuse: false,
    liverDisease: false,
    renalDisease: false,
    others: ''
  },
  hivTestResult: 'Unknown',
  startedOnArt: false,
  initialDisposition: undefined,
  doctorInCharge: '',
  finalDisposition: '', 
};

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onSuccess, initialData, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Patient>>(initialPatientState);
  const [loading, setLoading] = useState(false);
  const [isOtherWard, setIsOtherWard] = useState(false);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      // Deep copy to ensure history arrays are not references
      const data = JSON.parse(JSON.stringify(initialData));
      setFormData(data);
      // Check if current ward is 'Others'
      if (data.areaWard && !WARDS.includes(data.areaWard)) {
          setIsOtherWard(true);
      }
    }
  }, [initialData]);

  const handleChange = (field: keyof Patient, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBrgyChange = (brgy: string) => {
    let city = 'Makati';
    if (brgy === 'Outside Makati') {
        city = ''; // Allow manual entry
    } else if (EMBO_BARANGAYS.includes(brgy)) {
        city = 'Embo';
    }
    setFormData(prev => ({ ...prev, brgy, city }));
  };

  const handleWardSelectChange = (val: string) => {
      if (val === 'Others') {
          setIsOtherWard(true);
          handleChange('areaWard', ''); // Clear so user can type
      } else {
          setIsOtherWard(false);
          handleChange('areaWard', val);
      }
  };

  const handleComorbidityChange = (field: keyof Comorbidities, value: any) => {
    setFormData(prev => ({
      ...prev,
      comorbidities: {
        ...prev.comorbidities!,
        [field]: value
      }
    }));
  };

  const handleDispositionChange = (val: string) => {
      let updates: Partial<Patient> = { initialDisposition: val as any };
      
      if (['Discharged', 'Expired', 'Transferred'].includes(val)) {
          updates.finalDisposition = val === 'Transferred' ? 'Transferred out' : val as any;
      } else {
          if (['Discharged', 'Expired', 'Transferred out'].includes(formData.finalDisposition || '')) {
              updates.finalDisposition = '';
              updates.finalDispositionDate = '';
          }
      }
      setFormData(prev => ({ ...prev, ...updates }));
  };

  // --- Diagnostic History Handlers ---

  const addDiagnostic = (type: 'xpert' | 'smear') => {
      const newRecord: DiagnosticRecord = { date: '', result: 'Pending' };
      if (type === 'xpert') {
          setFormData(prev => ({ ...prev, xpertHistory: [...(prev.xpertHistory || []), newRecord] }));
      } else {
          setFormData(prev => ({ ...prev, smearHistory: [...(prev.smearHistory || []), newRecord] }));
      }
  };

  const updateDiagnostic = (type: 'xpert' | 'smear', index: number, field: keyof DiagnosticRecord, value: any) => {
      setFormData(prev => {
          const list = type === 'xpert' ? [...(prev.xpertHistory || [])] : [...(prev.smearHistory || [])];
          list[index] = { ...list[index], [field]: value };
          return type === 'xpert' ? { ...prev, xpertHistory: list } : { ...prev, smearHistory: list };
      });
  };

  const removeDiagnostic = (type: 'xpert' | 'smear', index: number) => {
       setFormData(prev => {
          const list = type === 'xpert' ? [...(prev.xpertHistory || [])] : [...(prev.smearHistory || [])];
          list.splice(index, 1);
          return type === 'xpert' ? { ...prev, xpertHistory: list } : { ...prev, smearHistory: list };
      });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (['Discharged', 'Expired', 'Transferred'].includes(formData.initialDisposition || '')) {
        if (!formData.finalDispositionDate) {
            alert("Please enter the Date of Disposition.");
            setLoading(false);
            return;
        }
        if (!formData.finalDisposition) {
            formData.finalDisposition = formData.initialDisposition === 'Transferred' ? 'Transferred out' : formData.initialDisposition as any;
        }
    }

    try {
      // Create a copy to submit
      const submissionData = JSON.parse(JSON.stringify(formData));
      await savePatient(submissionData as Patient);
      alert(initialData ? "Patient updated successfully!" : "Patient registered successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Failed to save patient. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none placeholder-gray-400";
  const isTerminalDisposition = ['Discharged', 'Expired', 'Transferred'].includes(formData.initialDisposition || '');
  const isActiveDisposition = ['ER-level', 'Admitted'].includes(formData.initialDisposition || '');

  const DiagnosticTable = ({ title, data, type }: { title: string, data: DiagnosticRecord[], type: 'xpert' | 'smear' }) => (
      <div className="border p-4 rounded-lg relative bg-white">
          <div className="flex justify-between items-center mb-4">
               <span className="font-bold text-gray-700 flex items-center gap-2">
                   <History size={16}/> {title}
               </span>
               <button type="button" onClick={() => addDiagnostic(type)} className="text-xs bg-osmak-green text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-osmak-green-dark">
                   <Plus size={12}/> Add Result
               </button>
          </div>
          
          {data && data.length > 0 ? (
              <div className="space-y-3">
                  {data.map((record, idx) => (
                      <div key={idx} className="flex gap-2 items-end bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="flex-1 space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase font-bold">Date <span className="font-normal normal-case">(leave blank if not done)</span></label>
                              <input type="date" className="w-full text-sm p-1 border rounded"
                                value={record.date} onChange={e => updateDiagnostic(type, idx, 'date', e.target.value)} />
                          </div>
                          <div className="flex-1 space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase font-bold">Result</label>
                              <select className="w-full text-sm p-1 border rounded"
                                value={record.result} onChange={e => updateDiagnostic(type, idx, 'result', e.target.value as LabResult)}>
                                {LAB_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                          <button type="button" onClick={() => removeDiagnostic(type, idx)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-sm text-gray-400 italic text-center py-2">No history recorded</div>
          )}
      </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-2">
            <div className="bg-osmak-green/10 p-2 rounded-lg text-osmak-green">
                <Save size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Patient Record' : 'New Patient Registration'}</h2>
                <p className="text-sm text-gray-500">{initialData ? 'Update patient details' : 'Enter complete PTB case details'}</p>
            </div>
        </div>
        {onCancel && (
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X size={24} />
            </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Demographics */}
        <section>
          <h3 className="text-lg font-semibold text-osmak-green-dark mb-4 flex items-center gap-2">
            1. Demographics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Hospital Number</label>
              <input required type="text" className={inputClass} 
                value={formData.hospitalNumber || ''} onChange={e => handleChange('hospitalNumber', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Last Name</label>
              <input required type="text" className={inputClass} 
                value={formData.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">First Name</label>
              <input required type="text" className={inputClass}
                value={formData.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">DOB</label>
              <input required type="date" className={inputClass}
                value={formData.dob || ''} onChange={e => handleChange('dob', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Sex</label>
              <select className={inputClass}
                value={formData.sex} onChange={e => handleChange('sex', e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Civil Status</label>
              <select className={inputClass}
                value={formData.civilStatus} onChange={e => handleChange('civilStatus', e.target.value)}>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Barangay</label>
              <select className={inputClass}
                value={formData.brgy} onChange={e => handleBrgyChange(e.target.value)}>
                <option value="">Select Barangay</option>
                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">City</label>
              <input type="text" 
                className={`w-full p-2 border rounded ${formData.brgy === 'Outside Makati' ? 'bg-white focus:ring-2 focus:ring-osmak-green' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                readOnly={formData.brgy !== 'Outside Makati'}
                value={formData.city} 
                onChange={e => handleChange('city', e.target.value)}
                placeholder={formData.brgy === 'Outside Makati' ? 'Enter City' : ''}
                />
            </div>
          </div>
        </section>

        {/* Section 2: Hospital Data */}
        <section className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-osmak-green-dark mb-4">2. Admission & Initial Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Disposition First */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Disposition</label>
              <select required className={inputClass}
                value={formData.initialDisposition || ''} onChange={e => handleDispositionChange(e.target.value)}>
                <option value="">Select Disposition</option>
                {DISPOSITION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Conditional Date Field for Terminal Dispositions */}
            {isTerminalDisposition && (
                 <div className="space-y-1 animate-fadeIn">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Date of Disposition</label>
                    <input required type="date" className={inputClass}
                        value={formData.finalDispositionDate || ''} onChange={e => handleChange('finalDispositionDate', e.target.value)} />
                </div>
            )}

             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Date of Admission</label>
              <input required type="date" className={inputClass}
                value={formData.dateOfAdmission || ''} onChange={e => handleChange('dateOfAdmission', e.target.value)} />
            </div>
             
             {/* Wards with Others Logic */}
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Area / Ward</label>
              <select required className={inputClass}
                value={isOtherWard ? 'Others' : formData.areaWard || ''} onChange={e => handleWardSelectChange(e.target.value)}>
                <option value="">Select Ward</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {isOtherWard && (
                  <input type="text" className={`${inputClass} mt-1 border-osmak-green`}
                    placeholder="Specify Ward Name"
                    autoFocus
                    required
                    value={formData.areaWard || ''} onChange={e => handleChange('areaWard', e.target.value)} />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Pulmonologist / IDS</label>
              <input required type="text" className={inputClass}
                placeholder="Dr. Name"
                value={formData.doctorInCharge || ''} onChange={e => handleChange('doctorInCharge', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Section 3: Diagnostics */}
        <section>
          <h3 className="text-lg font-semibold text-osmak-green-dark mb-4">3. Diagnostics (History)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DiagnosticTable title="Xpert MTB/RIF History" data={formData.xpertHistory || []} type="xpert" />
            <DiagnosticTable title="Smear Microscopy History" data={formData.smearHistory || []} type="smear" />
          </div>
        </section>

        {/* Section 4: Clinical Status */}
        <section className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-osmak-green-dark mb-4">4. Clinical & Treatment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Classification</label>
              <select className={inputClass}
                value={formData.bacteriologicalStatus} onChange={e => handleChange('bacteriologicalStatus', e.target.value)}>
                <option value="Bacteriological">Bacteriological Confirmed</option>
                <option value="Clinical">Clinically Diagnosed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Anatomical Site</label>
              <select className={inputClass}
                value={formData.anatomicalSite} onChange={e => handleChange('anatomicalSite', e.target.value)}>
                <option value="Pulmonary">Pulmonary</option>
                <option value="Extra-pulmonary">Extra-pulmonary</option>
              </select>
            </div>
            {formData.anatomicalSite === 'Extra-pulmonary' && (
               <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase">Specify Site</label>
                <input type="text" className={inputClass} placeholder="e.g. Meningitis, Pleural..."
                   value={formData.extraPulmonarySite || ''} onChange={e => handleChange('extraPulmonarySite', e.target.value)} />
              </div>
            )}
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Drug Susceptibility</label>
              <select className={inputClass}
                value={formData.drugSusceptibility} onChange={e => handleChange('drugSusceptibility', e.target.value)}>
                <option value="Drug-susceptible">Drug-susceptible</option>
                <option value="Drug Resistant">Drug Resistant</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
             <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">History</label>
              <select className={inputClass}
                value={formData.treatmentHistory} onChange={e => handleChange('treatmentHistory', e.target.value)}>
                <option value="New">New</option>
                <option value="Retreatment">Retreatment</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 text-osmak-green rounded bg-white"
                            checked={formData.treatmentStarted} 
                            onChange={e => handleChange('treatmentStarted', e.target.checked)} />
                        <span className="font-semibold text-gray-700">Treatment Started?</span>
                    </label>
                    {formData.treatmentStarted && (
                        <div className="space-y-1 flex-1 max-w-xs">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Start Date</label>
                            <input type="date" className={inputClass}
                                value={formData.treatmentStartDate || ''} onChange={e => handleChange('treatmentStartDate', e.target.value)} />
                        </div>
                    )}
                </div>

                {formData.treatmentStarted && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                         <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Starting Treatment Regimen</label>
                            <select className={inputClass}
                                value={formData.treatmentRegimen || ''} onChange={e => handleChange('treatmentRegimen', e.target.value)}>
                                <option value="">Select Regimen</option>
                                {TREATMENT_REGIMENS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Regimen Notes / Specify</label>
                            <input type="text" className={inputClass} 
                                placeholder="e.g. Sub-type (a, b, c) or ITR details"
                                value={formData.treatmentRegimenNotes || ''} onChange={e => handleChange('treatmentRegimenNotes', e.target.value)} />
                        </div>
                    </div>
                )}
             </div>
          </div>
        </section>

         {/* Section 5: Comorbidities & HIV */}
         <section>
          <h3 className="text-lg font-semibold text-osmak-green-dark mb-4">5. Comorbidities & HIV</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Comorbidities</label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-osmak-green rounded bg-white" checked={formData.comorbidities?.diabetes} 
                        onChange={e => handleComorbidityChange('diabetes', e.target.checked)} />
                    <span className="text-sm">Diabetes Mellitus</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-osmak-green rounded bg-white" checked={formData.comorbidities?.substanceAbuse} 
                        onChange={e => handleComorbidityChange('substanceAbuse', e.target.checked)} />
                    <span className="text-sm">Substance Abuse</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-osmak-green rounded bg-white" checked={formData.comorbidities?.liverDisease} 
                        onChange={e => handleComorbidityChange('liverDisease', e.target.checked)} />
                    <span className="text-sm">Liver Disease</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-osmak-green rounded bg-white" checked={formData.comorbidities?.renalDisease} 
                        onChange={e => handleComorbidityChange('renalDisease', e.target.checked)} />
                    <span className="text-sm">Renal Disease</span>
                </label>
                <div className="pt-2">
                    <input type="text" placeholder="Others (specify)" className={`${inputClass} text-sm`}
                        value={formData.comorbidities?.others} 
                        onChange={e => handleComorbidityChange('others', e.target.value)} />
                </div>
            </div>

            <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase">HIV Test Result</label>
                    <select className={inputClass}
                        value={formData.hivTestResult} onChange={e => handleChange('hivTestResult', e.target.value)}>
                        <option value="Unknown">Unknown</option>
                        <option value="Pending">Pending</option>
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                    </select>
                </div>
                {formData.hivTestResult === 'Positive' && (
                     <label className="flex items-center gap-2 p-3 bg-red-50 rounded border border-red-100">
                        <input type="checkbox" className="w-5 h-5 text-red-600 bg-white"
                            checked={formData.startedOnArt} 
                            onChange={e => handleChange('startedOnArt', e.target.checked)} />
                        <span className="font-bold text-red-800">Started on ART?</span>
                    </label>
                )}
            </div>
          </div>
        </section>

        {/* Section 6: Final Outcome (Only if Active) */}
        {isActiveDisposition && (
            <section className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fadeIn">
                 <div className="flex items-start gap-4">
                     <div className="p-2 bg-blue-100 rounded-full text-blue-600 mt-1">
                        <AlertCircle size={20} />
                     </div>
                     <div className="flex-1">
                        <h3 className="text-md font-bold text-blue-800 mb-2">Final Outcome / Disposition</h3>
                        <p className="text-xs text-blue-600 mb-3">
                            Patient is currently <strong>{formData.initialDisposition}</strong>. <br/>
                            You may optionally specify a Final Outcome if the patient has already been discharged or expired.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 uppercase">Final Disposition</label>
                                <select className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={formData.finalDisposition || ''} onChange={e => handleChange('finalDisposition', e.target.value)}>
                                    <option value="">-- Still Active --</option>
                                    {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 uppercase">Date of Disposition</label>
                                <input type="date" className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={formData.finalDispositionDate || ''} onChange={e => handleChange('finalDispositionDate', e.target.value)} />
                            </div>
                        </div>
                     </div>
                 </div>
            </section>
        )}

        <div className="flex justify-end pt-6 gap-3">
             {onCancel && (
                <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                    Cancel
                </button>
            )}
            <button 
                type="submit" 
                disabled={loading}
                className="bg-osmak-green hover:bg-osmak-green-dark text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50">
                {loading ? 'Saving...' : <><Save size={20} /> {initialData ? 'Update Record' : 'Submit Registration'}</>}
            </button>
        </div>

      </form>
    </div>
  );
};

export default PatientRegistration;