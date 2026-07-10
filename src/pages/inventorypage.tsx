import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import api from "../data/api";
import { getErrorMessage } from "../utils/apiError";
import { useBuilding } from "../context/BuildingContext";
import { useApiData } from "../hooks/useApiData";
import { Pagination } from "../components/Pagination";
import AddInventoryItemModal from "../components/AddInventoryItemModal";
import EditInventoryItemModal from "../components/EditInventoryItemModal";
import BulkUploadModal from "../components/BulkUploadModal";
import RestockModal from "../components/RestockModal";
import LedgerModal from "../components/LedgerModal";
import type { InventoryItem, StockStatus } from "../types/inventory";

const STOCK_BADGE: Record<StockStatus, { background: string; color: string; label: string }> = {
  // Severity is computed server-side (single source of truth, config-driven thresholds).
  NoStock: { background: "var(--danger)", color: "#fff", label: "No stock" }, // solid bright red
  Critical: { background: "var(--danger-sub)", color: "var(--danger)", label: "Critical" },
  Low: { background: "var(--warning-sub)", color: "var(--warning)", label: "Low stock" },
  InStock: { background: "rgba(34,197,94,0.12)", color: "var(--success)", label: "In stock" },
};

function StockBadge({ status }: { status?: StockStatus }) {
  const { background, color, label } = STOCK_BADGE[status ?? "InStock"];
  return (
    <span className="stock-badge" style={{ background, color }}>
      {label}
    </span>
  );
}

const PAGE_SIZE = 25;

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Modal visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Modal data
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [alertItems, setAlertItems] = useState<InventoryItem[]>([]);
  const [ledgerItem, setLedgerItem] = useState<{ catalogItemId: number; name: string } | null>(null);

  const { activeBuilding } = useBuilding();

  useEffect(() => { setPage(1); }, [activeBuilding]);

  const { data: pageData, reload: refresh } = useApiData<{ items: InventoryItem[]; totalCount: number }>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      params.set("buildingId", String(activeBuilding!.buildingId));
      if (search) params.set("search", search);
      if (stockFilter !== "all") params.set("stockStatus", stockFilter);
      return api.get(`/Inventory?${params}`).then((res) => res.data);
    },
    "Inventory failed to load.",
    {
      key: `${activeBuilding?.buildingId}|${page}|${search}|${stockFilter}`,
      debounceMs: 250,
      enabled: !!activeBuilding,
    },
  );
  const data = pageData?.items ?? [];
  const totalCount = pageData?.totalCount ?? 0;

  const handleDownloadTemplate = async () => {
    if (!activeBuilding) return;
    setDownloadError(null);
    try {
      const res = await api.get(`/Inventory/template?buildingId=${activeBuilding.buildingId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory_template_building_${activeBuilding.buildingId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    }
  };

  const handleOpenRestock = async () => {
    if (!activeBuilding) return;
    try {
      const res = await api.get(`/Inventory/alerts?buildingId=${activeBuilding.buildingId}`);
      setAlertItems(res.data);
    } catch {
      setAlertItems([]);
    }
    setShowRestockModal(true);
  };

  const handleOpenLedger = (item?: InventoryItem) => {
    setLedgerItem(
      item ? { catalogItemId: item.catalogItem!.catalogItemId, name: item.catalogItem?.name ?? "Unknown" } : null
    );
    setShowLedgerModal(true);
  };

  return (
    <PageShell>
      <div className="inventory-container" style={{ maxWidth: 900 }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Manage inventory
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          View and manage inventory items for this building.
        </p>

        <div className="table-toolbar">
          <input
            className="table-search"
            type="text"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="inventory-search"
          />
          <div className="table-actions">
            <select
              className="table-filter-select"
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              data-testid="stock-filter"
            >
              <option value="all">All stock levels</option>
              <option value="nostock">No stock</option>
              <option value="critical">Critical</option>
              <option value="low">Low stock</option>
              <option value="instock">In stock</option>
            </select>
            <button className="inventory-button inventory-button--secondary" onClick={handleDownloadTemplate}>
              Download Template
            </button>
            <button className="inventory-button inventory-button--secondary" onClick={() => setShowUploadModal(true)}>
              Bulk Upload
            </button>
            <button
              className="inventory-button inventory-button--secondary"
              onClick={() => handleOpenLedger()}
              data-testid="view-ledger-button"
            >
              Ledger
            </button>
            <button
              className="inventory-button inventory-button--secondary"
              onClick={handleOpenRestock}
              data-testid="receive-inventory-button"
            >
              Receive Inventory
            </button>
            <button className="inventory-button" onClick={() => setShowAddModal(true)} data-testid="add-inventory-button">
              <span>+</span> Add Inventory Item
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="alert alert--danger alert--inline" style={{ marginBottom: "0.5rem" }}>
            {typeof downloadError === "string" ? downloadError : "Template download failed."}
          </div>
        )}

        <div className="data-table-wrap">
          <table className="data-table" data-testid="inventory-table">
            <thead>
              <tr>
                <th>Item name</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Min Level</th>
                <th>Reorder Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search || stockFilter !== "all"
                      ? "No items match your filters."
                      : "No inventory items yet."}
                  </td>
                </tr>
              )}
              {data.map((item) => (
                <tr
                  key={item.itemNumber}
                  className="data-table-row"
                  onClick={() => { setEditItem(item); setShowEditModal(true); }}
                  data-testid={`inventory-row-${item.itemNumber}`}
                >
                  <td className="td-primary">{item.catalogItem?.name || <span className="td-empty">Unknown</span>}</td>
                  <td className="td-mono">{item.catalogItem?.sku || <span className="td-empty">—</span>}</td>
                  <td>{item.quantity}</td>
                  <td>{(item.minLevel ?? 0) > 0 ? item.minLevel : <span className="td-empty">—</span>}</td>
                  <td>{(item.reorderQty ?? 0) > 0 ? item.reorderQty : <span className="td-empty">—</span>}</td>
                  <td><StockBadge status={item.status} /></td>
                  <td className="td-arrow">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        <p className="table-count">{totalCount} item{totalCount !== 1 ? "s" : ""}</p>
      </div>

      {showAddModal && activeBuilding && (
        <AddInventoryItemModal
          buildingId={activeBuilding.buildingId}
          onClose={() => setShowAddModal(false)}
          onSaved={refresh}
        />
      )}

      {showEditModal && editItem && (
        <EditInventoryItemModal
          item={editItem}
          onClose={() => { setShowEditModal(false); setEditItem(null); }}
          onSaved={refresh}
          onViewHistory={(item) => handleOpenLedger(item)}
        />
      )}

      {showUploadModal && activeBuilding && (
        <BulkUploadModal
          buildingId={activeBuilding.buildingId}
          hasExistingItems={data.length > 0}
          onClose={() => setShowUploadModal(false)}
          onSaved={refresh}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}

      {showRestockModal && activeBuilding && (
        <RestockModal
          buildingId={activeBuilding.buildingId}
          alertItems={alertItems}
          onClose={() => setShowRestockModal(false)}
          onSaved={refresh}
        />
      )}

      {showLedgerModal && activeBuilding && (
        <LedgerModal
          buildingId={activeBuilding.buildingId}
          catalogItemId={ledgerItem?.catalogItemId}
          itemName={ledgerItem?.name}
          onClose={() => { setShowLedgerModal(false); setLedgerItem(null); }}
        />
      )}
    </PageShell>
  );
}
