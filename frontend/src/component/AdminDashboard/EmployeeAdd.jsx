import React, { useEffect, useState, useCallback } from "react";
//import {addEmployee, getEmployees, updateEmployee, mediaSrc} from '../API/apis';

const EmployeeAdd = () => {
  const initialForm = {
    Id: null,
    FirstName: "",
    LastName: "",
    Email: "",
    Phone: "",
    Positions: "",
    Memo: "",
    IsActive: 1,
    ProfileImage: null,
    Category: "",
  };

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchEmployees = useCallback(async () => {
    try {
      // const res = await getEmployees(); 

      // console.log("API RESPONSE:", res);

      // const data = res?.data?.data || res?.data || res;

      // setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleEdit = (emp) => {
    setFormData({
      Id: emp.id,
      FirstName: emp.firstName || "",
      LastName: emp.lastName || "",
      Email: emp.email || "",
      Phone: emp.phone || "",
      Positions: emp.position || "",
      Memo: emp.memo || "",
      IsActive: emp.isActive ? 1 : 0,
      Category: emp.category || "",
      ProfileImage: null, // Reset file input on edit
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // const token = localStorage.getItem("authToken");
    // if (!token) {
    //   alert("Please log in to perform this action.");
    //   setLoading(false);
    //   return;
    // }

    const payload = new FormData();

    payload.append("firstName", formData.FirstName.trim());
    payload.append("lastName", formData.LastName.trim());
    payload.append("email", formData.Email.trim());
    payload.append("phone", formData.Phone || "");
    payload.append("position", formData.Positions.trim());
    payload.append("memo", formData.Memo || "");
    payload.append("isActive", formData.IsActive);
    payload.append("category", formData.Category);

    if (formData.ProfileImage instanceof File) {
      payload.append("profileImage", formData.ProfileImage);
    }

    try {
      // let response;

      // if (isEditing) {
      //   response = await updateEmployee(formData.Id, payload);
      // } else {
      //   response = await addEmployee(payload);
      // }

      // alert(response.message || "Record saved!");

      setFormData(initialForm);
      setIsEditing(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);

      // const errorMsg =
      //   err.response?.data?.message ||
      //   err.response?.data?.error ||
      //   "Error saving record";

      // alert(`Server Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const currentItems = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 text-slate-700">
      {/* --- FORM SECTION --- */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg border border-slate-200"
      >
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          {isEditing ? "📝 Edit Staff Member" : "➕ Register New Staff"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          {/* Column 1: Identity */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                name="FirstName"
                placeholder="First Name"
                value={formData.FirstName}
                onChange={handleInput}
                required
                className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
              />
              <input
                name="LastName"
                placeholder="Last Name"
                value={formData.LastName}
                onChange={handleInput}
                required
                className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
              />
            </div>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleInput}
              required
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-white"
            >
              <option value="">Select Category</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-100">
              <input
                name="IsActive"
                type="checkbox"
                checked={formData.IsActive === 1}
                onChange={handleInput}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs font-bold uppercase text-slate-500">
                Active Employment Status
              </span>
            </label>
          </div>

          {/* Column 2: Contact & Position */}
          <div className="space-y-4">
            <input
              name="Email"
              type="email"
              placeholder="Email Address"
              value={formData.Email}
              onChange={handleInput}
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
            />
            <input
              name="Phone"
              placeholder="Phone Number"
              value={formData.Phone}
              onChange={handleInput}
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
            />
            <input
              name="Positions"
              placeholder="Job Title / Position"
              value={formData.Positions}
              onChange={handleInput}
              required
              className="w-full border rounded-lg p-2.5 outline-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Column 3: Media & Notes */}
          <div className="space-y-4">
            <textarea
              name="Memo"
              placeholder="Notes/Memo"
              value={formData.Memo}
              onChange={handleInput}
              className="w-full border rounded-lg p-2.5 h-24 resize-none outline-blue-500 bg-slate-50/50"
            />
            <div className="border-2 border-dashed rounded-lg p-4 text-center relative hover:bg-slate-50 transition border-slate-200">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) =>
                  setFormData((p) => ({ ...p, ProfileImage: e.target.files[0] }))
                }
              />
              <p className="text-xs text-slate-500 truncate">
                {formData.ProfileImage?.name || "Click to upload Profile Photo"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-black py-3 rounded-lg hover:bg-blue-700 transition transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? "PROCESSING..."
              : isEditing
              ? "UPDATE STAFF RECORD"
              : "PUBLISH STAFF RECORD"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setFormData(initialForm);
                setIsEditing(false);
              }}
              className="px-6 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition font-bold text-xs uppercase"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
        <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-lg">Staff Directory</h2>
          <span className="text-[11px] font-bold bg-white px-3 py-1 border border-slate-200 rounded-full text-slate-400 uppercase tracking-widest">
            {employees.length} Members Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Role & Notes</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 
                      const profileSrc = emp.profileImage
                        ? `${mediaSrc}${emp.profileImage}`
                        : "https://via.placeholder.com/40";
                      */}
                      <img
                        src=""
                        className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-white ring-1 ring-slate-200 flex-shrink-0"
                        alt="profile"
                      />
                      <div>
                        <p className="font-bold text-slate-700 leading-none mb-1">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tighter">
                          {emp.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center text-xs text-slate-600 font-medium tracking-tight">
                        {emp.email}
                      </span>
                      <span className="inline-flex items-center text-xs text-slate-400">
                        {emp.phone}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-700 font-bold text-xs uppercase tracking-tight">
                      {emp.position}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate max-w-[180px] italic">
                      "{emp.memo || "No notes available"}"
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight ${
                        emp.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {emp.isActive ? "● ACTIVE" : "○ INACTIVE"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleEdit(emp)}
                      className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all font-black py-2 px-5 rounded-lg text-[10px] uppercase shadow-sm border border-blue-100"
                    >
                      Edit Record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <div className="p-4 border-t flex justify-between items-center bg-slate-50/50">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-4 py-2 text-[11px] font-black uppercase border rounded-lg bg-white shadow-sm hover:bg-slate-50 disabled:opacity-25 transition"
          >
            Previous
          </button>
          <span className="text-[11px] font-bold text-slate-400">
            PAGE {currentPage} OF {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-4 py-2 text-[11px] font-black uppercase border rounded-lg bg-white shadow-sm hover:bg-slate-50 disabled:opacity-25 transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAdd;