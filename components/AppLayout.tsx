
import React from 'react';
import BottomNavBar from './BottomNavBar';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
};

export default AppLayout;
