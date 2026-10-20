import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
//import {getTestimonials, addTestimonial, updateTestimonial, IMAGE_URL} from '../API/apis'



const TestimonialAdd = () => {
  const navigate = useNavigate();
  const initialFormData = {
    id: null,
    name: "",
    designation: "",
    message: "",
    companylogo: null,
    Flag: null,
    isActive: 1,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 5;
  const [expandedId, setExpandedId] = useState(null);


  const fetchTestimonials = useCallback(async () => {

    try {
      // This will now work without a token because the backend doesn't check for one
      // const res = await getTestimonials();
      // setItems(res || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setItems([]);
    }
  }, []); // Removed navigate from dependencies
  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  /* ================= SUBMIT HANDLER ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to make changes.");
      navigate("/login");
      return;
    }

    setLoading(true);
    const fd = new FormData();

    // --- ADD THESE LINES TO FILL THE FORMDATA ---
    fd.append("name", formData.name);
    fd.append("designation", formData.designation);
    fd.append("message", formData.message);
    fd.append("isActive", formData.isActive);

    // Only append files if they exist (they are File objects from the input)
    if (formData.companylogo) {
      fd.append("companylogo", formData.companylogo);
    }
    if (formData.Flag) {
      fd.append("Flag", formData.Flag);
    }
    // --------------------------------------------

    try {
      // const url = isEditing 
      //   ? updateTestimonial(formData.id, fd, token)
      //   : addTestimonial(fd, token);
      
      // await ({
      //   method: isEditing ? "put" : "post",
      //   url: url,
      //   data: fd,
      //   headers: { 
      //     Authorization: `Bearer ${token}`,
      //     "Content-Type": "multipart/form-data" 
      //   },
      // });

      alert(isEditing ? "Updated Successfully" : "Created Successfully");
      setFormData(initialFormData);
      setIsEditing(false);
      fetchTestimonials();
    } catch (err) {
      console.error(err);
      // alert(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };


  /* ================= HANDLERS ================= */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      name: item.name || "",
      designation: item.designation || "",
      message: item.message || "",
      companylogo: null,
      Flag: null,
      isActive: item.isActive ? 1 : 0,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  /* ================= PAGINATION ================= */
  const indexOfLast = currentPage * postsPerPage;
  const indexOfFirst = indexOfLast - postsPerPage;
  const currentPosts = items.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(items.length / postsPerPage);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 text-slate-700">
      
      {/* ================= FORM SECTION (TOP) ================= */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          {isEditing ? "📝 Edit Testimonial" : "➕ Add New Testimonial"}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Identity */}
          <div className="space-y-4">
            <input
              name="name"
              placeholder="Client Name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
            />
            <input
              name="designation"
              placeholder="Company / Designation"
              value={formData.designation}
              onChange={handleInputChange}
              required
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
            />
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-100">
              <input 
                name="isActive" 
                type="checkbox" 
                checked={formData.isActive === 1} 
                onChange={handleInputChange} 
                className="w-4 h-4 text-blue-600 rounded" 
              />
              <span className="text-xs font-bold uppercase text-slate-500">Show on Website</span>
            </label>
          </div>

          {/* Col 2: Files */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Company Logo</label>
              <input type="file" name="companylogo" onChange={handleFileChange} className="text-xs w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Country Flag</label>
              <input type="file" name="Flag" onChange={handleFileChange} className="text-xs w-full border rounded-lg p-2" />
            </div>
          </div>

          {/* Col 3: Message */}
          <div className="space-y-4">
            <textarea
              name="message"
              placeholder="Testimonial Content..."
              value={formData.message}
              onChange={handleInputChange}
              required
              className="w-full border rounded-lg p-2.5 h-32 resize-none outline-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            disabled={loading} 
            className="flex-1 bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : isEditing ? "UPDATE TESTIMONIAL" : "PUBLISH TESTIMONIAL"}
          </button>
          {isEditing && (
            <button 
              type="button" 
              onClick={() => {setFormData(initialFormData); setIsEditing(false)}} 
              className="px-6 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition font-bold text-xs uppercase"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ================= TABLE SECTION (BOTTOM) ================= */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-lg">Testimonials Archive</h2>
          <span className="text-[11px] font-bold bg-white px-3 py-1 border border-slate-200 rounded-full text-slate-400 uppercase">
            {items.length} Total Entries
          </span>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-wider">
            <tr>
              <th className="p-4">Logo & Flag</th>
              <th className="p-4">Client Detail</th>
              <th className="p-4 w-1/3">Message</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentPosts.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img 
                      className="w-12 h-12 rounded object-contain border bg-white p-1" 
                      // src={item.companylogo ? `${IMAGE_URL}${item.companylogo}` : "https://via.placeholder.com/50"} 
                      src="https://via.placeholder.com/50"
                      alt="logo" 
                    />
                    {item.Flag && (
                      <img className="w-6 h-4 shadow-sm" src="https://via.placeholder.com/50" alt="flag" />
                      // <img className="w-6 h-4 shadow-sm" src={`${IMAGE_URL}${item.Flag}`} alt="flag" />
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-bold text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.designation}</p>
                </td>
                <td className="p-4 text-slate-500 italic text-xs leading-relaxed">
                  {expandedId === item.id ? item.message : item.message?.substring(0, 80) + "..."}
                  <button 
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-blue-500 ml-1 font-bold bg-transparent hover:bg-blue-100 transition-colors"
                  >
                    {expandedId === item.id ? "Show Less" : "Read More"}
                  </button>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                    {item.isActive ? "● ACTIVE" : "○ HIDDEN"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => handleEdit(item)} 
                    className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all font-black py-2 px-5 rounded-lg text-[10px] uppercase border border-blue-100 shadow-sm"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="p-4 border-t flex justify-between items-center bg-slate-50/50">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)} 
            className="px-4 py-2 text-[11px] font-black uppercase border rounded-lg bg-white disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-[11px] font-bold text-slate-400">Page {currentPage} of {totalPages || 1}</span>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(p => p + 1)} 
            className="px-4 py-2 text-[11px] font-black uppercase border rounded-lg bg-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonialAdd;