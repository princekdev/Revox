import { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleProfileModal } from "../../redux/slices/uiSlice.js";
import { updateProfile } from "../../redux/slices/authSlice.js";
import api from "../../utils/api.js";
import Modal from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import { toast } from "react-toastify";

export default function ProfileModal() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [name, setName] = useState(user?.name || "");
  const [previewUrl, setPreviewUrl] = useState(user?.profilePic || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handlePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Replace local blob URL with the real Cloudinary URL
      setPreviewUrl(res.data.url);
      // Persist immediately so header also updates
      await dispatch(updateProfile({ name, profilePic: res.data.url })).unwrap();
      toast.success("Profile picture updated");
    } catch (err) {
      console.error("Profile pic upload error:", err);
      setPreviewUrl(user?.profilePic || ""); // revert preview
      toast.error(err.response?.data?.error || "Upload failed — check your Cloudinary credentials");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await dispatch(updateProfile({ name: name.trim(), profilePic: previewUrl || user?.profilePic })).unwrap();
      toast.success("Profile updated");
      dispatch(toggleProfileModal());
    } catch (err) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => dispatch(toggleProfileModal())} title="Your Profile">
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar src={previewUrl} name={name} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 bg-brand-500 rounded-full
                flex items-center justify-center hover:bg-brand-600 transition-colors
                disabled:opacity-60"
            >
              {uploading ? (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
          </div>
          <p className="text-xs text-gray-500">Click the pencil to change your photo</p>
        </div>

        {/* Name + email fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="input-field opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => dispatch(toggleProfileModal())}
            className="btn-ghost flex-1 py-2.5 border border-dark-600 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
