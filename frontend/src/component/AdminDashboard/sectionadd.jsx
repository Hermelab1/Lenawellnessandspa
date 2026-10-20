import React, { useState, useEffect } from "react";
import { webApi } from "../Api/apilist";
import { Layers, Trash2, Edit2, Search } from "lucide-react";

const EMPTY_FORM = { pageId: "", sectionName: "" };

const SectionManagement = () => {
  const [pages, setPages] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      fetchSectionsByPage(selectedPageId);
    } else {
      setSections([]);
    }
  }, [selectedPageId]);

  const flash = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
  };

  const fetchInitialData = async () => {
    try {
      const res = await webApi.getPages();
      const pageList = res.data || [];
      setPages(pageList);
      if (pageList.length > 0) {
        setSelectedPageId(pageList[0].id);
      }
    } catch (err) {
      console.error("Fetch error", err);
      flash("error", err?.response?.data?.message || err?.message || "Failed to load pages");
    }
  };

  const fetchSectionsByPage = async (pageId) => {
    try {
      const res = await webApi.getSectionsByPage(pageId);
      setSections(res.data || []);
    } catch (err) {
      console.error("Fetch sections error", err);
      flash("error", err?.response?.data?.message || err?.message || "Failed to load sections");
    }
  };

  const resetForm = () => {
    setForm({ pageId: selectedPageId, sectionName: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      pageId: selectedPageId,
      sectionName: form.sectionName,
    };

    try {
      const res = editingId
        ? await webApi.updateSection(editingId, { sectionName: form.sectionName })
        : await webApi.addSection(payload);

      if (res.success) {
        await fetchSectionsByPage(selectedPageId);
        flash("success", `Section ${editingId ? "updated" : "created"} successfully!`);
        resetForm();
      } else {
        flash("error", res.message || "Action failed");
      }
    } catch (err) {
      flash("error", err?.response?.data?.message || err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return;

    try {
      const res = await webApi.deleteSection(id);
      if (res.success) {
        setSections((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) resetForm();
        flash("success", "Section deleted successfully!");
      } else {
        flash("error", res.message || "Delete failed");
      }
    } catch (err) {
      flash("error", err?.response?.data?.message || "Delete failed");
    }
  };

  const startEdit = (section) => {
    setEditingId(section.id);
    setForm({
      pageId: selectedPageId,
      sectionName: section.sectionName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const term = searchTerm.toLowerCase();
  const filteredSections = sections.filter((s) =>
    s?.sectionName?.toLowerCase().includes(term)
  );

  return (
    <div className="mx-auto space-y-6">
      {/* PAGE SELECTOR HEADER */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-indigo-600 font-bold">
          <Layers size={20} />
          <h2>Section Management</h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Select Page:</span>
          <select
            className="border p-2 rounded-lg text-sm bg-white w-full md:w-64"
            value={selectedPageId}
            onChange={(e) => {
              setSelectedPageId(e.target.value);
              resetForm();
            }}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pageName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FORM SECTION */}
      <section className="bg-white rounded-xl shadow-sm border p-5">
        <div className="font-bold text-gray-700 mb-3 text-sm">
          {editingId ? "Edit Section" : "Add New Section"}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border p-2 rounded-lg text-sm md:col-span-2"
            placeholder="Section Name (e.g., Hero Banner, Features, Footer)"
            value={form.sectionName}
            onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 items-center">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !selectedPageId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 w-full md:w-auto"
            >
              {loading ? "..." : editingId ? "Update Section" : "Add Section"}
            </button>
          </div>

          <div className="md:col-span-3 flex justify-between items-center">
            <span
              className={`text-xs ${
                status.type === "error" ? "text-red-500" : "text-green-600"
              }`}
            >
              {status.msg}
            </span>
          </div>
        </form>
      </section>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Sections ({sections.length})</h3>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <input
              className="pl-8 pr-3 py-1.5 border rounded-md text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="p-3">Section Name</th>
              <th className="p-3">Contents</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredSections.map((sec) => (
              <tr key={sec.id} className="hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-800">
                  {sec.sectionName}
                </td>

                <td className="p-3">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {sec.contents?.length || 0} Items
                  </span>
                </td>

                <td className="p-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(sec)}
                    title="Edit"
                    className="text-gray-500 hover:text-indigo-600 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(sec.id)}
                    title="Delete"
                    className="text-gray-500 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredSections.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400 text-xs">
                  No sections found for this page
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SectionManagement;