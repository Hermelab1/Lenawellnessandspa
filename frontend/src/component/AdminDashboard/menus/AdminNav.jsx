import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nav } from '../../data/AdminNav'; 

const Header = ({ selectedMenuText }) => { 
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) setUsername(storedUsername);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="h-[8vh] bg-white border-b border-slate-200 fixed top-0 right-0 w-[calc(100%-16rem)] z-10 flex items-center justify-between px-8">
      {/* Breadcrumb / Page Title */}
      <div className="flex items-center space-x-2 text-slate-500">
        <span className="text-xs uppercase tracking-wider font-semibold">Pages</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{selectedMenuText}</span>
      </div>
      
      {/* Profile Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-lg transition bg-white duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden md:block">{username}</span>
          <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl rounded-xl py-2 overflow-hidden ring-1 ring-black ring-opacity-5">
            {nav.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="block px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => setIsOpen(false)}
              >
                {item.text}
              </Link>
            ))}
            <hr className="my-1 border-slate-100" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 bg-white font-medium"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;