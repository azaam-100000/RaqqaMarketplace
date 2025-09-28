import React from 'react';
import Layout from '../components/Layout';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-cyan-400">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/>
  </svg>
);


const AuthLayout: React.FC<AuthLayoutProps> = ({ title, description, children }) => {
  return (
    <Layout>
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-8 w-full">
        <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
                <StoreIcon />
            </div>
          <p className="text-lg text-slate-400">مرحباً بك في</p>
          <h1 className="text-4xl font-bold text-cyan-400 my-2">سوق محافظة الرقه</h1>
          <h2 className="text-2xl font-bold text-white mt-6">{title}</h2>
          <p className="text-slate-400 mt-1">{description}</p>
        </div>
        {children}
      </div>
    </Layout>
  );
};

export default AuthLayout;
