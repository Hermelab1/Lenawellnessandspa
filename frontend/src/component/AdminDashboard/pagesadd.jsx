import React, { useState, useEffect } from "react";
import { webApi } from "../Api/apilist";
import { FileText, Trash2, Edit2, Search } from "lucide-react";

const EMPTY_FORM = { pageName: "", subPageName: "", pageDescription: "" };

const PageManagement = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    fetchPages();
  }, []);

  const flash = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
  };

  const fetchPages = async () => {
    try {
      const res = await webApi.getPages();
      setPages(res.data || []);
    } catch (err) {
      console.error("Fetch error", err);
      flash(
        "error",
        err?.response?.data?.message || err?.message || "Failed to load pages"
      );
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = editingId
        ? await webApi.updatePage(editingId, form)
        : await webApi.addPage(form);

      if (res.success) {
        await fetchPages();
        flash(
          "success",
          `Page ${editingId ? "updated" : "created"} successfully!`
        );
        resetForm();
      } else {
        flash("error", res.message || "Action failed");
      }
    } catch (err) {
      flash(
        "error",
        err?.response?.data?.message || err?.message || "Action failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;

    try {
      const res = await webApi.deletePage(id);
      if (res.success) {
        setPages((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) resetForm();
        flash("success", "Page deleted successfully!");
      } else {
        flash("error", res.message || "Delete failed");
      }
    } catch (err) {
      flash(
        "error",
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    }
  };

  const startEdit = (page) => {
    setEditingId(page.id);
    setForm({
      pageName: page.pageName || "",
      subPageName: page.subPageName || "",
      pageDescription: page.pageDescription || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const term = searchTerm.toLowerCase();
  const filteredPages = pages.filter(
    (p) =>
      p?.pageName?.toLowerCase().includes(term) ||
      p?.subPageName?.toLowerCase().includes(term) ||
      p?.pageDescription?.toLowerCase().includes(term)
  );

  return (
    <div className="mx-auto space-y-6">
      {/* FORM SECTION */}
      <section className="bg-white rounded-xl shadow-sm border p-5">
        <div className="flex items-center gap-2 mb-4 text-indigo-600">
          {editingId ? <Edit2 size={20} /> : <FileText size={20} />}
          <h2 className="font-bold">
            {editingId ? "Edit Web Page" : "Add Web Page"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <input
            className="border p-2 rounded-lg text-sm"
            placeholder="Page Name"
            value={form.pageName}
            onChange={(e) => setForm({ ...form, pageName: e.target.value })}
            required
          />

          <input
            className="border p-2 rounded-lg text-sm"
            placeholder="Sub Page Name"
            value={form.subPageName}
            onChange={(e) => setForm({ ...form, subPageName: e.target.value })}
          />

          <input
            className="border p-2 rounded-lg text-sm md:col-span-2"
            placeholder="Page Description"
            value={form.pageDescription}
            onChange={(e) =>
              setForm({ ...form, pageDescription: e.target.value })
            }
          />

          <div className="md:col-span-2 flex justify-between items-center mt-2">
            <span
              className={`text-xs ${
                status.type === "error" ? "text-red-500" : "text-green-600"
              }`}
            >
              {status.msg}
            </span>

            <div className="flex gap-2">
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
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                {loading ? "..." : editingId ? "Update Page" : "Create Page"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Web Pages ({pages.length})</h3>

          <div className="relative">
            <Search
              className="absolute left-2.5 top-2.5 text-gray-400"
              size={14}
            />
            <input
              className="pl-8 pr-3 py-1.5 border rounded-md text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="p-3">Page Name</th>
              <th className="p-3">Sub Page Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Sections</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredPages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-800">
                  {page.pageName}
                </td>

                <td className="p-3 text-gray-600 text-xs">
                  {page.subPageName || "—"}
                </td>

                <td className="p-3 text-gray-600 text-xs">
                  {page.pageDescription || "No description provided"}
                </td>

                <td className="p-3">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {page.sections?.length || 0} Sections
                  </span>
                </td>

                <td className="p-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(page)}
                    title="Edit"
                    className="text-gray-500 hover:text-indigo-600 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    title="Delete"
                    className="text-gray-500 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredPages.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400 text-xs">
                  No pages found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PageManagement;