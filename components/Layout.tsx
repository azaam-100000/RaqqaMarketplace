
import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 p-4">
      <div className="w-full" style={{ maxWidth: '420px' }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
