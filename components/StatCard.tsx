import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'bg-white', onClick, isActive }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        ${color} p-4 rounded-xl shadow-sm border transition-all duration-200 flex flex-col justify-between
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}
        ${isActive ? 'ring-2 ring-osmak-green ring-offset-2' : 'border-gray-200'}
      `}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${isActive ? 'bg-osmak-green text-white' : 'bg-gray-50 text-osmak-green'}`}>
          {/* React.cloneElement allows us to override size if icon is a valid element, though lucide icons usually take size prop */}
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
        </div>
      </div>
      {trend && (
        <div className="text-xs text-gray-500 mt-2">
          {trend}
        </div>
      )}
    </div>
  );
};

export default StatCard;