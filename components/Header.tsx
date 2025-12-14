import React, { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';

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
          PTB Registry
        </span>
      </div>

      <div className="ml-auto">
        {rightContent}
      </div>
    </header>
  );
};

export default Header;