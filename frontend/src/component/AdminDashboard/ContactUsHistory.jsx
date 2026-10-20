import React, { useState, useEffect, useCallback } from 'react';
// import { getContactMessages, updateContactStatus, deleteContact } from '../API/apis';
import { FiTrash2, FiCheckCircle, FiCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Contactushistory = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(5);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      /* 
      const response = await getContactMessages();
      setPosts(response);
      */
      setPosts([]); // Default to empty array for now
      setErrorMsg('');
    } catch (error) {
      setErrorMsg("Failed to synchronize with the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleStatusToggle = async (id, currentStatus) => {
    const token = localStorage.getItem('authToken');
    
    // Debug: Check if token actually exists before making the call
    if (!token) {
      alert("You are not logged in or your session has expired.");
      return;
    }

    try {
      /* 
      await updateContactStatus(id, { isRead: !currentStatus });
      */
      setPosts(prev => prev.map(p => p.id === id ? { ...p, isRead: !currentStatus } : p));
    } catch (error) {
      console.error("Error response:", error.response?.data);
      alert(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("This action cannot be undone. Delete record?")) return;
    try {
      /* 
      await deleteContact(id);
      */
      setPosts(prev => prev.filter(post => post.id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed.");
    }
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(posts.length / postsPerPage) || 1;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#105F4E] rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-medium text-gray-500">Retrieving records...</p>
    </div>
  );

  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Inquiry History</h2>
            <p className="text-sm text-gray-500">Manage and respond to customer messages</p>
          </div>
          <span className="px-3 py-1 bg-[#105F4E]/10 text-[#105F4E] rounded-full text-xs font-bold uppercase tracking-wider">
            {posts.length} Total
          </span>
        </div>

        {errorMsg && (
          <div className="m-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-widest font-semibold">
                <th className="px-8 py-4">Status</th>
                <th className="px-4 py-4">Sender</th>
                <th className="px-4 py-4">Message Preview</th>
                <th className="px-4 py-4">Date</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentPosts.length > 0 ? (
                currentPosts.map((post) => (
                  <tr key={post.id} className={`hover:bg-gray-50/80 transition-colors ${!post.isRead ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => handleStatusToggle(post.id, post.isRead)}
                        className={`flex items-center bg-transparent gap-2 text-xs font-bold ${post.isRead ? 'text-gray-400' : 'text-[#105F4E]'}`}
                      >
                        {post.isRead ? <FiCheckCircle /> : <FiCircle className="animate-pulse" />}
                        {post.isRead ? 'READ' : 'NEW'}
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-semibold text-gray-900">{post.FullName}</div>
                      <div className="text-xs text-gray-500">{post.Email}</div>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-600 max-w-[200px] truncate">
                      {post.Memo}
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-8 text-center text-gray-400 italic">
                    No contact records found (API data commented out)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION FOOTER --- */}
        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">
            Showing {posts.length > 0 ? indexOfFirstPost + 1 : 0} - {Math.min(indexOfLastPost, posts.length)} of {posts.length}
          </p>
          <div className="flex items-center gap-3">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-md border bg-white disabled:opacity-30 hover:bg-gray-100 transition-colors"
            >
              <FiChevronLeft />
            </button>
            <span className="text-sm font-bold text-gray-700">{currentPage}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-md border bg-white disabled:opacity-30 hover:bg-gray-100 transition-colors"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contactushistory;