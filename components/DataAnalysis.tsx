import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Patient, DiagnosticRecord } from '../types';
import { getPatients } from '../services/dataService';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

// OsMak Brand & UI Colors
const COLORS = {
  primary: '#009a3e', // OsMak Green
  secondary: '#007530',
  accent: '#f59e0b', // Amber/Orange
  danger: '#dc2626', // Red
  info: '#3b82f6',   // Blue
  neutral: '#9ca3af', // Gray
  pie: ['#009a3e', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#64748b']
};

const DataAnalysis: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Data Processors ---

  // 1. Monthly Census (Time vs Census)
  const censusData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    patients.forEach(p => {
      if (!p.dateOfAdmission) return;
      const date = new Date(p.dateOfAdmission);
      // Format YYYY-MM
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    // Sort keys and convert to array
    return Object.keys(counts).sort().map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        patients: counts[key],
        rawDate: key
      };
    });
  }, [patients]);

  // 2. Outcomes / Disposition
  const outcomeData = useMemo(() => {
    const counts: Record<string, number> = {
      'Active (Admitted)': 0,
      'Active (ER)': 0,
      'Discharged': 0,
      'Expired': 0,
      'Transferred': 0,
      'Others': 0
    };

    patients.forEach(p => {
      const final = p.finalDisposition;
      const initial = p.initialDisposition;

      // Determine effective status
      if (final === 'Discharged') counts['Discharged']++;
      else if (final === 'Expired') counts['Expired']++;
      else if (final === 'Transferred out') counts['Transferred']++;
      else if (!final && initial === 'Admitted') counts['Active (Admitted)']++;
      else if (!final && initial === 'ER-level') counts['Active (ER)']++;
      else counts['Others']++;
    });

    return Object.keys(counts)
      .filter(key => counts[key] > 0)
      .map(key => ({ name: key, value: counts[key] }));
  }, [patients]);

  // 3. Classification (Bacteriological vs Clinical)
  const classificationData = useMemo(() => {
    const counts = { 'Bacteriological': 0, 'Clinical': 0, 'Pending': 0 };
    patients.forEach(p => {
        const status = p.bacteriologicalStatus;
        if (status === 'Bacteriological') counts['Bacteriological']++;
        else if (status === 'Clinical') counts['Clinical']++;
        else counts['Pending']++;
    });
    return [
        { name: 'Bacteriological', value: counts['Bacteriological'] },
        { name: 'Clinical', value: counts['Clinical'] },
        { name: 'Pending', value: counts['Pending'] },
    ].filter(d => d.value > 0);
  }, [patients]);

  // 4. Diagnostics (Xpert & Smear)
  const diagnosticData = useMemo(() => {
    const xpertCounts = { Positive: 0, Negative: 0, Pending: 0 };
    const smearCounts = { Positive: 0, Negative: 0, Pending: 0 };

    const getLatest = (hist: DiagnosticRecord[]) => {
        if (!hist || hist.length === 0) return 'Pending';
        // Sort by date descending assuming string compare works for ISO YYYY-MM-DD
        const sorted = [...hist].sort((a, b) => (b.date > a.date ? 1 : -1));
        return sorted[0].result;
    };

    patients.forEach(p => {
        const xResult = getLatest(p.xpertHistory);
        const sResult = getLatest(p.smearHistory);

        if (xResult === 'Positive' || xResult === 'Trace') xpertCounts.Positive++;
        else if (xResult === 'Negative') xpertCounts.Negative++;
        else xpertCounts.Pending++;

        if (sResult === 'Positive') smearCounts.Positive++;
        else if (sResult === 'Negative') smearCounts.Negative++;
        else smearCounts.Pending++;
    });

    return [
        { name: 'Positive', xpert: xpertCounts.Positive, smear: smearCounts.Positive },
        { name: 'Negative', xpert: xpertCounts.Negative, smear: smearCounts.Negative },
        { name: 'Pending/Other', xpert: xpertCounts.Pending, smear: smearCounts.Pending },
    ];
  }, [patients]);

  // 5. Top 5 Wards
  const wardData = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach(p => {
        const ward = p.areaWard || 'Unknown';
        counts[ward] = (counts[ward] || 0) + 1;
    });
    
    return Object.keys(counts)
        .map(key => ({ name: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8
  }, [patients]);

  // 6. Age Groups
  const ageData = useMemo(() => {
    const groups = { '0-18': 0, '19-39': 0, '40-59': 0, '60+': 0 };
    
    patients.forEach(p => {
        if (!p.dob) return;
        const birthDate = new Date(p.dob);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        
        if (age < 19) groups['0-18']++;
        else if (age < 40) groups['19-39']++;
        else if (age < 60) groups['40-59']++;
        else groups['60+']++;
    });

    return Object.keys(groups).map(key => ({ name: key, value: (groups as any)[key] }));
  }, [patients]);


  if (loading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <div className="text-osmak-green animate-pulse text-lg font-semibold">Generating Analytics...</div>
          </div>
      );
  }

  const CardHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <div className="p-1.5 bg-osmak-green/10 rounded text-osmak-green">
            <Icon size={18} />
          </div>
          <h3 className="font-bold text-gray-700">{title}</h3>
      </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Data Analysis & Visualization</h2>
          <span className="text-sm text-gray-500">Based on {patients.length} total records</span>
      </div>

      {/* Row 1: Time Series (Full Width) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <CardHeader title="Monthly Census Trend (Admissions)" icon={TrendingUp} />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={censusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="patients" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorPatients)" name="New Admissions" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Row 2A: Outcomes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <CardHeader title="Patient Disposition Overview" icon={PieIcon} />
            <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={outcomeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {outcomeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Row 2B: Classification */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <CardHeader title="Case Classification" icon={Activity} />
             <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={classificationData}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                             <Cell fill={COLORS.primary} /> {/* Bacteriological */}
                             <Cell fill={COLORS.info} />    {/* Clinical */}
                             <Cell fill={COLORS.neutral} /> {/* Pending */}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36}/>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Row 3A: Diagnostics Comparison */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <CardHeader title="Diagnostic Yield (Xpert vs Smear)" icon={BarChart3} />
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diagnosticData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Legend />
                        <Bar dataKey="xpert" name="Xpert MTB/RIF" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="smear" name="Smear Microscopy" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

         {/* Row 3B: Ward Distribution */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <CardHeader title="Top Departments / Wards" icon={BarChart3} />
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wardData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" name="Patients" fill={COLORS.secondary} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

         {/* Row 4: Demographics */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
            <CardHeader title="Patient Age Distribution" icon={UsersIcon} />
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" name="Number of Patients" fill={COLORS.accent} radius={[4, 4, 0, 0]} barSize={40}>
                             {ageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

// Helper icon wrapper since lucide-react exports are React components
const UsersIcon = (props: any) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={props.size || 24} 
      height={props.size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export default DataAnalysis;