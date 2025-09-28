
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200"
    />
  );
};

export default Input;
