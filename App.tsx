import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PatientRegistration from './components/PatientRegistration';
import DataAnalysis from './components/DataAnalysis';
import { LayoutDashboard, UserPlus, FileSpreadsheet, Lock, LogOut, BarChart3 } from 'lucide-react';
import { getPatients } from './services/dataService';

type View = 'landing' | 'login' | 'dashboard' | 'register' | 'analysis';

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Initial Data Load: Warm the cache when the app first mounts
  useEffect(() => {
    getPatients().catch(err => console.error("Initial data load failed:", err));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ptb123') {
      setIsAuthenticated(true);
      setView('dashboard');
      setAuthError('');
      setPassword('');
    } else {
      setAuthError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('landing');
  };

  const LandingPage = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to OsMak Tuberculosis Registry</h1>
        <p className="text-gray-600">Please select an action to proceed</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button 
          onClick={() => setView('register')}
          className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-osmak-green transition-all group text-left">
          <div className="bg-osmak-green/10 w-12 h-12 rounded-lg flex items-center justify-center text-osmak-green mb-4 group-hover:bg-osmak-green group-hover:text-white transition-colors">
            <UserPlus size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Register Patient</h3>
          <p className="text-sm text-gray-500">Create a new registry entry for an incoming or admitted patient.</p>
        </button>

        <button 
          onClick={() => setView('login')}
          className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-blue-500 transition-all group text-left">
          <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <LayoutDashboard size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Dashboard</h3>
          <p className="text-sm text-gray-500">View active cases, analytics, and update patient dispositions. (Requires Password)</p>
        </button>
      </div>
    </div>
  );

  const LoginPage = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <Lock size={24} className="text-gray-600" />
          </div>
          <h2 className="text-xl font-bold">Restricted Access</h2>
          <p className="text-sm text-gray-500">Enter password to view dashboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="password" 
              placeholder="Enter password" 
              className="w-full p-3 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-osmak-green focus:outline-none placeholder-gray-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            {authError && <p className="text-red-500 text-xs mt-1 ml-1">{authError}</p>}
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => { setView('landing'); setAuthError(''); setPassword(''); }}
              className="flex-1 py-3 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-osmak-green hover:bg-osmak-green-dark text-white rounded-lg font-bold transition-colors shadow-sm">
              Access
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      <Header 
        toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        isSidebarOpen={isSidebarOpen}
        // Only show hamburger menu if authenticated (sidebar is present)
        hideMenu={!isAuthenticated} 
        rightContent={
          isAuthenticated ? (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-red-600 px-3 py-2 rounded-lg transition-colors text-xs md:text-sm font-medium border border-white/20 ml-2"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          ) : (
            view === 'register' ? (
              <button 
                onClick={() => setView('landing')}
                className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Exit Registration</span>
              </button>
            ) : null
          )
        }
      />

      <div className="flex flex-1 relative">
        
        {/* Sidebar Navigation - Only shown when authenticated */}
        {isAuthenticated && (
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto
            ${isSidebarOpen ? 'translate-x-0 pt-20 lg:pt-0' : '-translate-x-full'}
            shadow-xl lg:shadow-none
          `}>
            <div className="p-6 space-y-3 mt-4">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl font-bold transition-all duration-200 ${
                  view === 'dashboard' 
                    ? 'bg-osmak-green text-white shadow-md shadow-green-900/10' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <LayoutDashboard size={24} className={view === 'dashboard' ? 'text-white' : 'text-osmak-green'} />
                <span className="text-lg tracking-tight">Dashboard</span>
              </button>

              <button
                onClick={() => setView('register')}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl font-bold transition-all duration-200 ${
                  view === 'register' 
                    ? 'bg-osmak-green text-white shadow-md shadow-green-900/10' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <UserPlus size={24} className={view === 'register' ? 'text-white' : 'text-osmak-green'} />
                <span className="text-lg tracking-tight">Register Patient</span>
              </button>

              <button
                onClick={() => setView('analysis')}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl font-bold transition-all duration-200 ${
                  view === 'analysis' 
                    ? 'bg-osmak-green text-white shadow-md shadow-green-900/10' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <BarChart3 size={24} className={view === 'analysis' ? 'text-white' : 'text-osmak-green'} />
                <span className="text-lg tracking-tight">Data Analysis</span>
              </button>

              <div className="pt-8 mt-6 border-t border-gray-100">
                <a
                  href="https://docs.google.com/spreadsheets/d/1j2Rqc1BO_x6jbtv5Xfpx3Hsaq0cUpY62l-0vc2rWsHg/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 w-full px-5 py-3 rounded-xl font-medium text-gray-500 hover:bg-gray-50 transition-colors group"
                >
                  <FileSpreadsheet size={24} className="text-osmak-green opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="text-base">Database Sheet</span>
                </a>
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-full px-6">
              <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-400 text-center leading-relaxed">
                  OsMak Tuberculosis Registry v1.0<br/>
                  <span className="font-semibold text-gray-500">Authorized Use Only</span>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {view === 'landing' && <LandingPage />}
          {view === 'login' && <LoginPage />}
          
          {view === 'dashboard' && isAuthenticated && (
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Department Dashboard</h2>
                    <button 
                        onClick={() => setView('register')}
                        className="bg-osmak-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-osmak-green-dark transition-colors md:hidden">
                        + New Case
                    </button>
                </div>
                <Dashboard />
            </div>
          )}

          {view === 'analysis' && isAuthenticated && (
            <DataAnalysis />
          )}
          
          {view === 'register' && (
            <div className="animate-fadeIn">
                <PatientRegistration onSuccess={() => {
                    // If authenticated (admin), go back to dashboard
                    // If public mode, go back to landing
                    if (isAuthenticated) {
                        setView('dashboard');
                    } else {
                        setView('landing');
                    }
                }} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && isAuthenticated && (
        <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;