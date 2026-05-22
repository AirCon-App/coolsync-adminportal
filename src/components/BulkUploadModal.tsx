import { useState, useEffect } from "react";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";

interface Props {
  buildingId: number;
  hasExistingItems: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDownloadTemplate: () => void;
}

export default function BulkUploadModal({ buildingId, hasExistingItems, onClose, onSaved, onDownloadTemplate }: Props) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await api.post(
        `/Inventory/upload?buildingId=${buildingId}&mode=add`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setUploadStatus(res.data.message || "Upload successful.");
      onSaved();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="inventory-modal-backdrop" onClick={() => onClose()}>
      <div
        className="inventory-modal-card"
        style={{ maxWidth: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Bulk upload inventory</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
          Upload a CSV file to update inventory for this building.
        </p>

        <div
          style={{
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            borderRadius: 8,
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
          }}
          role="alert"
          aria-live="polite"
        >
          <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            How this upload works
          </p>
          <ul style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0, paddingLeft: "1.1rem", lineHeight: 1.6 }}>
            <li><strong>Existing items:</strong> Quantities are <em>added</em> to current stock (e.g., 10 on hand + 5 in CSV = 15 total)</li>
            <li><strong>New items:</strong> Items not in inventory are created with the uploaded quantity</li>
            <li><strong>Min Level / Reorder Qty:</strong> Updated if provided, otherwise unchanged</li>
          </ul>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
          Required columns: <code>FilterName</code>, <code>Quantity</code>. Optional: <code>SKU</code>, <code>MinLevel</code>, <code>ReorderQty</code>, <code>Area</code>.
        </p>
        {hasExistingItems && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 0 }}>
            Need the right format?{" "}
            <button
              type="button"
              onClick={onDownloadTemplate}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "inherit",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Download your current inventory as a template
            </button>
          </p>
        )}
        <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="file"
            accept=".csv"
            className="inventory-modal-input"
            style={{ marginBottom: 0, cursor: "pointer" }}
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            required
          />
          {uploadError && (
            <div className="alert alert--danger alert--inline">
              {typeof uploadError === "string" ? uploadError : "Upload failed."}
            </div>
          )}
          {uploadStatus && (
            <div className="alert alert--success alert--inline">{uploadStatus}</div>
          )}
          <div className="inventory-modal-actions" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="button inventory-modal-cancel" onClick={onClose}>
              {uploadStatus ? "Close" : "Cancel"}
            </button>
            {!uploadStatus && (
              <button type="submit" className="button" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
