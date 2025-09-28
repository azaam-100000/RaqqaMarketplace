
import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'google';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, loading = false, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "w-full flex items-center justify-center font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500",
    secondary: "bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500",
    google: "bg-white text-slate-800 hover:bg-gray-200 focus:ring-slate-500"
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default Button;
