import React, { useState, useEffect, useRef } from "react";
import { webApi } from "../Api/apilist";
import { LayoutPanelTop, Trash2, Edit2, Search, Upload, X, Image as ImageIcon } from "lucide-react";

const EMPTY_FORM = {
  pageId: "",
  sectionId: "",
  content: "",
  contentType: "text",
  contentImages: "",
};

const SectionContentManagement = () => {
  const [pages, setPages] = useState([]);
  const [sections, setSections] = useState([]);
  const [contents, setContents] = useState([]);

  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const fileInputRef = useRef(null);

  useEffect(() => { fetchPages(); }, []);

  useEffect(() => {
    if (selectedPageId) fetchSections(selectedPageId);
    else { setSections([]); setSelectedSectionId(""); }
  }, [selectedPageId]);

  useEffect(() => {
    if (selectedSectionId) fetchContents(selectedSectionId);
    else setContents([]);
  }, [selectedSectionId]);

  const flash = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
  };

  const fetchPages = async () => {
    try {
      const res = await webApi.getPages();
      const pageList = res.data || [];
      setPages(pageList);
      if (pageList.length > 0) setSelectedPageId(pageList[0].id);
    } catch (err) {
      console.error("Fetch pages error", err);
      flash("error", "Failed to load pages");
    }
  };

  const fetchSections = async (pageId) => {
    try {
      const res = await webApi.getSectionsByPage(pageId);
      const sectionList = res.data || [];
      setSections(sectionList);
      setSelectedSectionId(sectionList.length > 0 ? sectionList[0].id : "");
    } catch (err) {
      console.error("Fetch sections error", err);
      flash("error", "Failed to load sections");
    }
  };

  const fetchContents = async (sectionId) => {
    try {
      const res = await webApi.getContentBySection(sectionId);
      setContents(res.data || []);
    } catch (err) {
      console.error("Fetch contents error", err);
      flash("error", "Failed to load contents");
    }
  };

  const resetForm = () => {
    setForm({
      pageId: selectedPageId,
      sectionId: selectedSectionId,
      content: "",
      contentType: "text",
      contentImages: "",
    });
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ===== IMAGE UPLOAD HANDLER =====
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type & size (adjust as needed)
    if (!file.type.startsWith("image/")) {
      flash("error", "Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("error", "Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      // --- OPTION A: If you have an upload endpoint ---
      // const formData = new FormData();
      // formData.append("file", file);
      // const res = await webApi.uploadImage(formData);
      // if (!res.success) throw new Error(res.message || "Upload failed");
      // const imageUrl = res.data.url;
      // setForm((f) => ({ ...f, contentImages: imageUrl }));

      // --- OPTION B: Preview locally (no server upload) ---
      // Use FileReader to preview, and either send base64 or upload separately
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((f) => ({ ...f, contentImages: reader.result }));
      };
      reader.readAsDataURL(file);

      flash("success", "Image selected");
    } catch (err) {
      flash("error", err?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, contentImages: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      sectionId: selectedSectionId,
      content: form.content,
      contentType: form.contentType,
      contentImages: form.contentImages,
    };

    try {
      const res = editingId
        ? await webApi.updateContent(editingId, payload)
        : await webApi.addContent(payload);

      if (res.success) {
        await fetchContents(selectedSectionId);
        flash("success", `Content ${editingId ? "updated" : "added"} successfully!`);
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
    if (!window.confirm("Are you sure you want to delete this content item?")) return;
    try {
      const res = await webApi.deleteContent(id);
      if (res.success) {
        setContents((prev) => prev.filter((c) => c.id !== id));
        if (editingId === id) resetForm();
        flash("success", "Content deleted successfully!");
      } else {
        flash("error", res.message || "Delete failed");
      }
    } catch (err) {
      flash("error", err?.response?.data?.message || "Delete failed");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      pageId: selectedPageId,
      sectionId: selectedSectionId,
      content: item.content || "",
      contentType: item.contentType || "text",
      contentImages: item.contentImages || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const term = searchTerm.toLowerCase();
  const filteredContents = contents.filter(
    (c) =>
      c?.content?.toLowerCase().includes(term) ||
      c?.contentType?.toLowerCase().includes(term) ||
      c?.contentImages?.toLowerCase().includes(term)
  );

  const isImagePreview = form.contentImages?.startsWith("data:image") ||
                         /\.(jpe?g|png|gif|webp|svg)$/i.test(form.contentImages || "");

  return (
    <div className="mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm border p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="flex items-center gap-2 text-indigo-600 font-bold">
          <LayoutPanelTop size={20} />
          <h2>Content Management</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="border p-2 rounded-lg text-sm bg-white w-full"
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
          >
            <option value="">Select Page</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.pageName}</option>
            ))}
          </select>

          <select
            className="border p-2 rounded-lg text-sm bg-white w-full"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedPageId}
          >
            <option value="">Select Section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.sectionName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FORM */}
      <section className="bg-white rounded-xl shadow-sm border p-5">
        <div className="font-bold text-gray-700 mb-3 text-sm">
          {editingId ? "Edit Section Content" : "Add Content Item"}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="border p-2 rounded-lg text-sm bg-white"
            value={form.contentType}
            onChange={(e) => setForm({ ...form, contentType: e.target.value })}
            required
          >
            <option value="text">Text</option>
            <option value="html">HTML</option>
            <option value="image">Image</option>
            <option value="card">Card</option>
            <option value="banner">Banner</option>
          </select>

          {/* ===== IMAGE BROWSE FIELD ===== */}
          <div className="md:col-span-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {!form.contentImages ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50"
              >
                <Upload size={16} />
                {uploading ? "Uploading..." : "Browse & Upload Image"}
              </button>
            ) : (
              <div className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50">
                <div className="w-16 h-16 flex-shrink-0 bg-white rounded border overflow-hidden flex items-center justify-center">
                  {isImagePreview ? (
                    <img
                      src={form.contentImages}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={24} className="text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{form.contentImages}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:underline mt-1"
                  >
                    Replace
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearImage}
                  title="Remove image"
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <textarea
            className="border p-2 rounded-lg text-sm md:col-span-2 h-24 resize-none"
            placeholder="Content text / HTML markup..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />

          <div className="md:col-span-2 flex justify-between items-center mt-1">
            <span className={`text-xs ${status.type === "error" ? "text-red-500" : "text-green-600"}`}>
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
                disabled={loading || uploading || !selectedSectionId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                {loading ? "..." : editingId ? "Update Content" : "Add Content"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Contents ({contents.length})</h3>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <input
              className="pl-8 pr-3 py-1.5 border rounded-md text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Search contents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="p-3">Type</th>
              <th className="p-3">Content</th>
              <th className="p-3">Images</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredContents.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    {item.contentType}
                  </span>
                </td>

                <td className="p-3 text-gray-800 text-xs truncate max-w-xs">
                  {item.content}
                </td>

                <td className="p-3 text-gray-500 text-xs">
                  {item.contentImages ? (
                    /\.(jpe?g|png|gif|webp|svg)$/i.test(item.contentImages) ||
                    item.contentImages.startsWith("data:image") ? (
                      <img
                        src={item.contentImages}
                        alt=""
                        className="w-10 h-10 object-cover rounded border"
                      />
                    ) : (
                      <span className="truncate block max-w-[120px]">{item.contentImages}</span>
                    )
                  ) : (
                    "N/A"
                  )}
                </td>

                <td className="p-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(item)}
                    title="Edit"
                    className="text-gray-500 hover:text-indigo-600 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                    className="text-gray-500 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredContents.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400 text-xs">
                  No content found for this section
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SectionContentManagement;