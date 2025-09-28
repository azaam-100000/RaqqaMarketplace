import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea: React.FC<TextareaProps> = (props) => {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200 resize-none"
    />
  );
};

export default Textarea;
