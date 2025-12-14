import React, { ReactNode } from 'react';
import { Menu, X, Grid } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  hideMenu?: boolean;
  rightContent?: ReactNode;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, hideMenu = false, rightContent }) => {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-4 bg-osmak-green text-white px-4 py-3 shadow-md">
      {!hideMenu && (
        <button 
          onClick={toggleSidebar}
          className="p-1 hover:bg-osmak-green-dark rounded-md lg:hidden transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      <img 
        src="https://maxterrenal-hash.github.io/justculture/osmak-logo.png" 
        alt="OsMak Logo" 
        className="h-12 w-auto object-contain"
      />
      
      <div className="flex flex-col">
        <h1 className="m-0 text-base md:text-lg font-bold tracking-wide uppercase leading-tight">
          OSPITAL NG MAKATI
        </h1>
        <span className="text-xs md:text-sm opacity-90 font-light">
          Tuberculosis Registry
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <a 
          href="https://osmakwebapps.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-xs md:text-sm font-medium border border-white/20"
          title="Go to Osmak Web Apps Portal"
        >
          <Grid size={18} />
          <span className="hidden sm:inline">Web Portal</span>
        </a>
        
        {rightContent}
      </div>
    </header>
  );
};

export default Header;