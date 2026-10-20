import React, { useEffect, useState, useCallback } from "react";
// import {getBlogs, addBlog, updateBlog, mediaSrc} from '../API/apis';

const mediaSrc = ""; // Placeholder for the commented-out import

const BlogAdd = () => {
  const initialForm = { id: null, blogcode: "", blogTitle: "", blogDescription: "", bologdate: "", mediaSrc: null, isActive: true };
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // NEW: State for the Detail Modal
  const [selectedBlog, setSelectedBlog] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      /* 
      const res = await getBlogs();
      setPosts(res);
      */
      setPosts([]); // Default to empty array for now
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleEdit = (post) => {
    const formattedDate = post.bologdate ? post.bologdate.split('T')[0] : "";
    setFormData({ ...post, bologdate: formattedDate, mediaSrc: null, isActive: !!post.isActive });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    data.append("blogcode", formData.blogcode);
    data.append("blogTitle", formData.blogTitle);
    data.append("blogDescription", formData.blogDescription);
    data.append("blogdate", formData.bologdate); 
    data.append("isActive", formData.isActive ? 1 : 0);
    
    if (formData.mediaSrc instanceof File) {
      data.append("mediaSrc", formData.mediaSrc);
    }

    try {
      /*
      const url = isEditing ? await updateBlog(formData.id, data, localStorage.getItem("authToken")) : await addBlog(data, localStorage.getItem("authToken"));
      await ({ 
        method: isEditing ? 'put' : 'post', 
        url, 
        data, 
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("authToken")}`, 
          "Content-Type": "multipart/form-data" 
        }
      });
      */
      
      setFormData(initialForm);
      setIsEditing(false);
      // fetchPosts();
      alert("Success! (API call commented out)");
    } catch (err) { alert(err.response?.data?.message || "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 text-slate-700 relative">
      
      {/* --- DETAIL MODAL --- */}
      {selectedBlog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-slate-800">{selectedBlog.blogTitle}</h2>
                <button onClick={() => setSelectedBlog(null)} className="text-slate-400 hover:text-red-500 text-2xl">&times;</button>
              </div>
              
              <img 
                src={selectedBlog.mediaSrc ? `${mediaSrc}${selectedBlog.mediaSrc}` : "https://via.placeholder.com/600x300"} 
                className="w-full h-64 object-cover rounded-lg mb-4 border"
                alt="Full preview"
              />

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-slate-400 uppercase text-[10px] font-bold">Code</p>
                  <p className="font-mono font-bold">{selectedBlog.blogcode}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-slate-400 uppercase text-[10px] font-bold">Published Date</p>
                  <p className="font-bold">{new Date(selectedBlog.bologdate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Description</p>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedBlog.blogDescription}</p>
              </div>

              <div className="flex gap-4 border-t pt-4">
                 <div className="text-center flex-1">
                    <p className="text-blue-600 font-bold text-lg">{selectedBlog.viewCount || 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Views</p>
                 </div>
                 <div className="text-center flex-1">
                    <p className="text-pink-600 font-bold text-lg">{selectedBlog.likeCount || 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Likes</p>
                 </div>
                 <div className="text-center flex-1">
                    <p className="text-purple-600 font-bold text-lg">{selectedBlog.shareCount || 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Shares</p>
                 </div>
              </div>
            </div>
            <div className="bg-slate-50 p-4 text-right rounded-b-xl">
              <button onClick={() => setSelectedBlog(null)} className="px-6 py-2 bg-slate-800 text-white rounded-md font-bold text-sm hover:bg-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM SECTION */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg shadow-md border border-slate-200">
        <h3 className="font-bold text-lg mb-4">{isEditing ? "📝 Edit Post" : "➕ New Post"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-3">
            <input name="blogcode" placeholder="Code" value={formData.blogcode} onChange={handleInput} required className="w-full border rounded-md p-2 outline-blue-500" />
            <input name="blogTitle" placeholder="Title" value={formData.blogTitle} onChange={handleInput} required className="w-full border rounded-md p-2 outline-blue-500" />
            <input name="bologdate" type="date" value={formData.bologdate} onChange={handleInput} required className="w-full border rounded-md p-2 outline-blue-500" />
            <label className="flex items-center gap-2 cursor-pointer p-1">
              <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleInput} /> Active
            </label>
          </div>
          <textarea name="blogDescription" placeholder="Description" value={formData.blogDescription} onChange={handleInput} required className="w-full border rounded-md p-2 h-24 md:h-full outline-blue-500" />
          <div className="space-y-3">
            <div className="border-2 border-dashed rounded-md p-4 text-center relative hover:bg-slate-50">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFormData(p => ({...p, mediaSrc: e.target.files[0]}))} />
              <p className="text-xs text-slate-500 truncate px-2">{formData.mediaSrc?.name || "Upload Image"}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? "..." : isEditing ? "UPDATE" : "PUBLISH"}
              </button>
              {isEditing && <button type="button" onClick={() => {setFormData(initialForm); setIsEditing(false)}} className="px-4 bg-slate-100 rounded-md">Cancel</button>}
            </div>
          </div>
        </div>
      </form>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-4">Blog Info</th>
                <th className="p-4">Content</th>
                <th className="p-4">Date</th>
                <th className="p-4">Engagement Stats</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={post.mediaSrc ? `${mediaSrc}${post.mediaSrc}` : "https://via.placeholder.com/50"} 
                          className="w-12 h-12 object-cover rounded shadow-sm flex-shrink-0" 
                          alt="thumb" 
                        />
                        <span className="font-bold text-slate-700">{post.blogcode}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 truncate max-w-[150px]">{post.blogTitle}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{post.blogDescription}</p>
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      {post.bologdate ? new Date(post.bologdate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                          <i className="fa-solid fa-eye mr-1"></i> {post.viewCount || 0}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-pink-50 text-pink-600 text-[10px] font-bold border border-pink-100">
                          <i className="fa-solid fa-heart mr-1"></i> {post.likeCount || 0}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-600 text-[10px] font-bold border border-purple-100">
                          <i className="fa-solid fa-share-nodes mr-1"></i> {post.shareCount || 0}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-black ${post.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {post.isActive ? "● ACTIVE" : "○ HIDDEN"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                          {/* VIEW BUTTON */}
                          <button 
                          onClick={() => setSelectedBlog(post)} 
                          className="text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-all font-bold py-1.5 px-3 rounded shadow-sm text-[10px]"
                          >
                          VIEW
                          </button>

                          {/* EDIT BUTTON */}
                          <button 
                          onClick={() => handleEdit(post)} 
                          className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all font-bold py-1.5 px-3 rounded shadow-sm text-[10px]"
                          >
                          EDIT
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                    No blog posts found (API data commented out)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlogAdd;