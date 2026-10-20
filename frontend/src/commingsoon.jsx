// src/ComingSoon.jsx
import React from "react";

const ComingSoon = ({ title = "Page", username }) => {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <i className="fa-solid fa-screwdriver-wrench text-5xl text-blue-500 mb-4"></i>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 text-sm">
        This module is under construction.
      </p>
      {username && (
        <p className="text-xs text-slate-400 mt-2">Signed in as: {username}</p>
      )}
    </div>
  );
};

export default ComingSoon;