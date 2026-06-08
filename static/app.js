const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const addBtn = document.getElementById("addBtn");
const itemModal = document.getElementById("itemModal");
const itemForm = document.getElementById("itemForm");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const deleteBtn = document.getElementById("deleteBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportBtn = document.getElementById("exportBtn");
const exportModal = document.getElementById("exportModal");
const exportForm = document.getElementById("exportForm");
const closeExport = document.getElementById("closeExport");
const exportToday = document.getElementById("exportToday");
const totalCount = document.getElementById("totalCount");
const inStockCount = document.getElementById("inStockCount");
const deliveredCount = document.getElementById("deliveredCount");
const reportUpdated = document.getElementById("reportUpdated");
const statusBar = document.getElementById("statusBar");
const statusLegend = document.getElementById("statusLegend");
const modelChart = document.getElementById("modelChart");
const termsType = document.getElementById("termsType");
const termsDays = document.getElementById("termsDays");

let items = [];
let currentId = null;

const fields = [
  "stock_no",
  "code",
  "category",
  "system",
  "model",
  "rating",
  "status",
  "serial_number",
  "client",
  "date_acquired",
  "date_installed",
  "dr_no",
  "si_no",
  "po",
  "value_vat_ex",
  "warranty",
  "terms",
  "remarks",
];

const labels = {
  stock_no: "Stock #",
  code: "Code",
  system: "System",
  category: "Category",
  model: "Model",
  rating: "Rating",
  status: "Status",
  serial_number: "Serial Number",
  client: "Client",
  date_acquired: "Date Acquired",
  date_installed: "Date Installed",
  dr_no: "DR No.",
  si_no: "SI No.",
  po: "PO",
  value_vat_ex: "Value VAT EX",
  warranty: "Warranty",
  terms: "Terms",
  remarks: "Remarks",
};

function statusDisplay(value) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (upper === "DELIVERED") return { label: raw, className: "delivered" };
  if (upper === "MISSING" || upper === "MISSONG" || upper === "UNIDENTIFIED") {
    return { label: "Unidentified", className: "missing" };
  }
  return { label: raw, className: "in-stock" };
}

function formatTerms(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "COD") return "COD";
  const match = raw.match(/^(\d+)\s*(DAYS?)?$/i);
  if (match) return `${match[1]} days`;
  return raw;
}

function parseTerms(value) {
  if (!value) return { type: "days", days: "" };
  const raw = String(value).trim();
  if (!raw) return { type: "days", days: "" };
  if (raw.toUpperCase() === "COD") return { type: "cod", days: "" };
  const match = raw.match(/^(\d+)\s*(DAYS?)?$/i);
  if (match) return { type: "days", days: match[1] };
  return { type: "days", days: "" };
}

function updateTermsValue() {
  if (!itemForm) return;
  const termsField = itemForm.elements["terms"];
  if (!termsField) return;
  const type = termsType ? termsType.value : "days";
  const termsRow = termsType ? termsType.closest(".terms-row") : null;

  if (type === "cod") {
    if (termsRow) termsRow.classList.add("is-cod");
    if (termsDays) {
      termsDays.value = "";
      termsDays.disabled = true;
    }
    termsField.value = "COD";
    return;
  }

  if (termsRow) termsRow.classList.remove("is-cod");
  if (termsDays) termsDays.disabled = false;
  const daysVal = termsDays ? String(termsDays.value || "").trim() : "";
  termsField.value = daysVal ? `${daysVal} days` : "";
}

function syncTermsFieldsFromValue(value) {
  if (!termsType || !termsDays) return;
  const parsed = parseTerms(value);
  termsType.value = parsed.type;
  termsDays.value = parsed.days;
  updateTermsValue();
}

function updateStatusOptionLabels() {
  const selects = [];
  if (statusFilter) selects.push(statusFilter);
  if (itemForm && itemForm.elements["status"]) selects.push(itemForm.elements["status"]);

  selects.forEach((select) => {
    Array.from(select.options || []).forEach((option) => {
      const upper = String(option.value || option.textContent || "").trim().toUpperCase();
      if (upper === "MISSING" || upper === "MISSONG" || upper === "UNIDENTIFIED") {
        option.textContent = "Unidentified";
      }
    });
  });
}

function warrantyDisplay(item) {
  const stockNo = String(item && item.stock_no ? item.stock_no : "").trim();
  if (stockNo === "129") return "1YR ON BATT/2YRS ON UPS";
  return item && item.warranty ? item.warranty : "";
}

function openModal(item) {
  if (!itemModal || !itemForm) return;
  itemModal.classList.add("show");
  itemModal.setAttribute("aria-hidden", "false");
  itemForm.reset();
  currentId = item ? item.id : null;
  if (modalTitle) modalTitle.textContent = item ? "Edit Item" : "Add Item";
  if (deleteBtn) deleteBtn.style.display = item ? "inline-flex" : "none";

  if (item) {
    fields.forEach((field) => {
      itemForm.elements[field].value = item[field] || "";
    });
    syncTermsFieldsFromValue(item.terms);
  }
  else {
    // set next stock number for new items
    try {
      const maxStock = items.reduce((max, it) => {
        const n = Number(String(it.stock_no || '').trim()) || 0;
        return n > max ? n : max;
      }, 0);
      if (itemForm.elements['stock_no']) itemForm.elements['stock_no'].value = String(maxStock + 1);
    } catch (e) {}
    syncTermsFieldsFromValue("");
  }
}

function closeModalView() {
  if (!itemModal) return;
  itemModal.classList.remove("show");
  itemModal.setAttribute("aria-hidden", "true");
}

function renderTable() {
  if (!tableBody || !searchInput || !statusFilter) return;
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value.trim().toLowerCase();

  const filtered = items.filter((item) => {
    const matchesSearch = !search
      ? true
      : fields.some((field) => String(item[field] || "").toLowerCase().includes(search));
    const matchesStatus = !status
      ? true
      : String(item.status || "").toLowerCase() === status;
    return matchesSearch && matchesStatus;
  });

  tableBody.innerHTML = "";
  filtered.forEach((item) => {
    const row = document.createElement("tr");
    const updatedAt = formatDateTime(item.created_at);
    const cells = [
      item.stock_no,
      item.model,
      item.rating,
      item.status,
      item.serial_number,
      item.client,
      item.date_acquired,
      item.date_installed,
      updatedAt,
    ];

    cells.forEach((value, index) => {
      const td = document.createElement("td");
      // truncate long columns (model, serial number, client)
      if (index === 1 || index === 4 || index === 5) {
        td.classList.add("truncate-cell");
        td.title = value || "";
      }
      if (index === 8 && value && typeof value === "object") {
        td.classList.add("updated-cell");
        td.innerHTML = `${value.date}<span class="updated-time">${value.time}</span>`;
        row.appendChild(td);
        return;
      }
      if (index === 3) {
        const statusInfo = statusDisplay(value);
        const badge = document.createElement("span");
        badge.className = `status-pill ${statusInfo.className}`;
        badge.textContent = statusInfo.label;
        td.appendChild(badge);
      } else {
        td.textContent = value || "";
      }
      row.appendChild(td);
    });

    const actions = document.createElement("td");
    actions.className = "table-actions";
    const detailsBtn = document.createElement("button");
    detailsBtn.className = "ghost btn-small soft-btn";
    detailsBtn.textContent = "Details";
    const editBtn = document.createElement("button");
    editBtn.className = "ghost btn-small soft-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openModal(item));
    actions.appendChild(detailsBtn);
    actions.appendChild(editBtn);
    row.appendChild(actions);

    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 10;
    detailsCell.innerHTML = `
      <div class="details-panel">
        <div class="details-grid">
          <div class="detail-item"><span class="detail-label">Stock #</span><input class="detail-input" readonly value="${item.stock_no || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item model"><span class="detail-label">Model</span><input class="${inputClassFor(item.model)}" readonly value="${item.model || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Brand</span><input class="detail-input" readonly value="${item.system || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Category</span><input class="detail-input" readonly value="${item.category || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Rating</span><input class="detail-input" readonly value="${item.rating || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Status</span><input class="detail-input" readonly value="${statusDisplay(item.status).label}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Serial Number</span><input class="detail-input small" readonly value="${item.serial_number || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item client"><span class="detail-label">Client</span><input class="${inputClassFor(item.client)}" readonly value="${item.client || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Date Acquired</span><input class="detail-input" readonly value="${item.date_acquired || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Date Installed</span><input class="detail-input" readonly value="${item.date_installed || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">DR No.</span><input class="detail-input" readonly value="${item.dr_no || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">SI No.</span><input class="detail-input" readonly value="${item.si_no || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">PO</span><input class="detail-input" readonly value="${item.po || ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Value VAT EX</span><input class="detail-input" readonly value="${item.value_vat_ex ? formatPeso(item.value_vat_ex) : ''}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Warranty</span><input class="detail-input" readonly value="${warrantyDisplay(item)}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item"><span class="detail-label">Terms</span><input class="detail-input" readonly value="${formatTerms(item.terms)}" placeholder="N/A" onclick="this.select()" /></div>
          <div class="detail-item full"><span class="detail-label">Remarks</span><input class="detail-input small" readonly value="${item.remarks || ''}" placeholder="N/A" onclick="this.select()" /></div>
        </div>
      </div>
    `;
    detailsRow.appendChild(detailsCell);

    detailsBtn.addEventListener("click", () => {
      detailsRow.classList.toggle("show");
    });

    tableBody.appendChild(row);
    tableBody.appendChild(detailsRow);
  });
}

function formatPeso(value) {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const normalized = raw.replace(/,/g, "").replace(/^₱/i, "");
  const amount = Number(normalized);
  if (Number.isNaN(amount)) return raw;
  return `₱ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const parsed = new Date(hasTz ? raw : `${raw}Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return {
    date: parsed.toLocaleDateString("en-US", {
      timeZone: "Asia/Singapore",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }),
    time: parsed.toLocaleTimeString("en-US", {
      timeZone: "Asia/Singapore",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

  function detailValue(val, asPeso=false) {
    if (val === null || val === undefined || String(val).trim() === "") return '<span class="detail-na">N/A</span>';
    return asPeso ? formatPeso(val) : String(val);
  }

  function inputClassFor(val, limit=24) {
    return (val && String(val).length > limit) ? 'detail-input small' : 'detail-input';
  }

async function fetchItems() {
  if (!tableBody) return;
  const response = await fetch(`/api/items?ts=${Date.now()}`, { cache: "no-store" });
  const data = await response.json();
  items = data.items || [];
  renderTable();
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function renderStatusBarData(inStock, delivered) {
  if (!statusBar || !statusLegend) return;
  const total = inStock + delivered;
  statusBar.innerHTML = "";
  statusLegend.innerHTML = "";

  if (total === 0) {
    statusBar.textContent = "No data yet";
    statusLegend.textContent = "Add items to see the split.";
    return;
  }

  const inStockPct = Math.round((inStock / total) * 100);
  const deliveredPct = 100 - inStockPct;

  const inStockSeg = document.createElement("span");
  inStockSeg.className = "status-segment in-stock";
  inStockSeg.style.width = `${inStockPct}%`;

  const deliveredSeg = document.createElement("span");
  deliveredSeg.className = "status-segment delivered";
  deliveredSeg.style.width = `${deliveredPct}%`;

  statusBar.appendChild(inStockSeg);
  statusBar.appendChild(deliveredSeg);

  statusLegend.innerHTML = `
    <div><span class="legend-dot in-stock"></span>On Stock: ${inStock}</div>
    <div><span class="legend-dot delivered"></span>Delivered: ${delivered}</div>
  `;
}

function renderModelChartData(models) {
  if (!modelChart) return;
  modelChart.innerHTML = "";
  if (!models.length) {
    modelChart.textContent = "No data yet";
    return;
  }
  const maxValue = Math.max(...models.map((entry) => entry.count));
  models.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "model-row";

    const label = document.createElement("span");
    label.className = "model-label";
    label.textContent = entry.model;

    const barWrap = document.createElement("div");
    barWrap.className = "model-bar";
    const bar = document.createElement("span");
    bar.style.width = `${Math.round((entry.count / maxValue) * 100)}%`;
    barWrap.appendChild(bar);

    const value = document.createElement("span");
    value.className = "model-value";
    value.textContent = entry.count;

    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(value);
    modelChart.appendChild(row);
  });
}

async function fetchSummary() {
  const response = await fetch("/api/summary", { cache: "no-store" });
  if (!response.ok) return;
  const data = await response.json();

  // update global totals if present
  if (document.getElementById('totalUps')) {
    const ups = data.category_counts && data.category_counts['UPS'] ? data.category_counts['UPS'] : { total: 0, on_stock: 0, delivered: 0 };
    document.getElementById('totalUps').textContent = ups.total || 0;
    const upsOn = document.getElementById('upsInStock'); if (upsOn) upsOn.textContent = ups.on_stock || 0;
    const upsDel = document.getElementById('upsDelivered'); if (upsDel) upsDel.textContent = ups.delivered || 0;
  }

  if (document.getElementById('totalAvr')) {
    const avr = data.category_counts && data.category_counts['AVR'] ? data.category_counts['AVR'] : { total: 0, on_stock: 0, delivered: 0 };
    document.getElementById('totalAvr').textContent = avr.total || 0;
    const avrOn = document.getElementById('avrInStock'); if (avrOn) avrOn.textContent = avr.on_stock || 0;
    const avrDel = document.getElementById('avrDelivered'); if (avrDel) avrDel.textContent = avr.delivered || 0;
  }

  // legacy/status-summary for overall charts
  const statusCounts = data.status_counts || [];
  const statusMap = new Map(
    statusCounts.map((entry) => [normalizeStatus(entry.status), entry.count])
  );
  const inStock = statusMap.get("ON STOCK") || 0;
  const delivered = statusMap.get("DELIVERED") || 0;

  // overall totals
  if (totalCount) totalCount.textContent = data.total_count || 0;
  if (inStockCount) inStockCount.textContent = inStock;
  if (deliveredCount) deliveredCount.textContent = delivered;
  if (reportUpdated) {
    const now = new Date();
    reportUpdated.textContent = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  renderStatusBarData(inStock, delivered);
  renderModelChartData(data.model_counts || []);
}

function openExportModal(type) {
  if (!exportModal || !exportForm) return;
  exportForm.reset();
  exportForm.elements.type.value = type;
  exportModal.classList.add("show");
  exportModal.setAttribute("aria-hidden", "false");
}

function closeExportModal() {
  if (!exportModal) return;
  exportModal.classList.remove("show");
  exportModal.setAttribute("aria-hidden", "true");
}

function applyExport(type, start, end) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  if (type === "pdf") {
    // PDF export removed
    return;
  }
  const url = `/api/export?${params.toString()}`;
  window.location.href = url;
}

async function saveItem(event) {
  if (!itemForm) return;
  event.preventDefault();
  updateTermsValue();
  const payload = {};
  fields.forEach((field) => {
    payload[field] = itemForm.elements[field].value.trim();
  });

  // client-side validation: require only status and serial_number
  const required = ['status','serial_number'];
  const missing = required.filter(f => !payload[f] || payload[f] === '');
  if (missing.length > 0) {
    console.warn('Missing required fields:', missing, payload);
    // visually mark missing fields on the form
    missing.forEach((m) => {
      try {
        const el = itemForm.elements[m];
        if (el) el.style.outline = '2px solid #d9534f';
      } catch (e) {}
    });
    // focus first missing
    try { const first = missing[0]; const firstEl = itemForm.elements[first]; if (firstEl && typeof firstEl.focus === 'function') firstEl.focus(); } catch (e) {}
    // show existsModal if available with clearer message
    try {
      const titleEl = document.getElementById('existsTitle');
      const msgEl = document.getElementById('existsMsg');
      const existsOkBtn = document.getElementById('existsOk');
      const closeExistsBtn = document.getElementById('closeExists');
      if (titleEl && msgEl) {
        titleEl.textContent = 'Please fill required fields';
        msgEl.textContent = 'Please fill required fields before saving: ' + missing.map(m => ({status:'Status',serial_number:'Serial Number'}[m]||m)).join(', ');
        if (existsOkBtn) existsOkBtn.disabled = false;
        if (closeExistsBtn) closeExistsBtn.style.display = 'none';
        const existsModal = document.getElementById('existsModal');
        if (existsModal) { existsModal.classList.add('show'); existsModal.setAttribute('aria-hidden','false'); }
      }
    } catch (e) {}
    return;
  }

  const url = currentId ? `/api/items/${currentId}` : "/api/items";
  const method = currentId ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = 'Save failed. Please try again.';
    try {
      const data = await response.json();
      if (data && data.error) {
        message = data.error;
      }
    } catch (err) {
      // ignore invalid JSON
    }
    try {
      const titleEl = document.getElementById('existsTitle');
      const msgEl = document.getElementById('existsMsg');
      if (titleEl && msgEl) {
        titleEl.textContent = 'Save failed';
        msgEl.textContent = message;
        const existsModal = document.getElementById('existsModal');
        const existsOkBtn = document.getElementById('existsOk');
        const closeExistsBtn = document.getElementById('closeExists');
        if (existsOkBtn) existsOkBtn.disabled = false;
        if (closeExistsBtn) closeExistsBtn.style.display = '';
        if (existsModal) { existsModal.classList.add('show'); existsModal.setAttribute('aria-hidden','false'); return; }
      }
    } catch (e) {}
    console.error('Save failed, and existsModal not found');
    return;
  }

  await fetchItems();
  await fetchSummary();
  closeModalView();
}

const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const closeConfirm = document.getElementById("closeConfirm");

async function performDeleteItem() {
  if (!currentId) return;
  const response = await fetch(`/api/items/${currentId}`, { method: "DELETE" });
  if (!response.ok) {
    try {
      const titleEl = document.getElementById('existsTitle');
      const msgEl = document.getElementById('existsMsg');
      if (titleEl && msgEl) {
        titleEl.textContent = 'Delete failed';
        msgEl.textContent = 'Delete failed.';
        const existsModal = document.getElementById('existsModal');
        const existsOkBtn = document.getElementById('existsOk');
        const closeExistsBtn = document.getElementById('closeExists');
        if (existsOkBtn) existsOkBtn.disabled = false;
        if (closeExistsBtn) closeExistsBtn.style.display = '';
        if (existsModal) { existsModal.classList.add('show'); existsModal.setAttribute('aria-hidden','false'); return; }
      }
    } catch (e) {}
    console.error('Delete failed, and existsModal not found');
    return;
  }
  await fetchItems();
  await fetchSummary();
  closeModalView();
}

async function deleteItem() {
  if (!deleteBtn) return;
  if (!currentId) return;
  if (!confirmModal) {
    // fallback to native confirm if modal not present
    if (!confirm("Delete this item?")) return;
    await performDeleteItem();
    return;
  }
  confirmModal.classList.add("show");
  confirmModal.setAttribute("aria-hidden", "false");
}

function closeConfirmModal() {
  if (!confirmModal) return;
  confirmModal.classList.remove("show");
  confirmModal.setAttribute("aria-hidden", "true");
}

if (confirmYes) {
  confirmYes.addEventListener("click", async () => {
    closeConfirmModal();
    await performDeleteItem();
  });
}
if (confirmNo) {
  confirmNo.addEventListener("click", () => closeConfirmModal());
}
if (closeConfirm) {
  closeConfirm.addEventListener("click", () => closeConfirmModal());
}

if (addBtn) addBtn.addEventListener("click", () => openModal(null));
if (closeModal) closeModal.addEventListener("click", closeModalView);
if (itemModal) {
  itemModal.addEventListener("click", (event) => {
    if (event.target === itemModal) closeModalView();
  });
}
if (termsType) termsType.addEventListener("change", updateTermsValue);
if (termsDays) termsDays.addEventListener("input", updateTermsValue);
if (itemForm) itemForm.addEventListener("submit", saveItem);
if (deleteBtn) deleteBtn.addEventListener("click", deleteItem);
if (searchInput) searchInput.addEventListener("input", renderTable);
if (statusFilter) statusFilter.addEventListener("change", renderTable);
if (exportBtn) exportBtn.addEventListener("click", () => openExportModal("excel"));
if (closeExport) closeExport.addEventListener("click", closeExportModal);
if (exportModal) {
  exportModal.addEventListener("click", (event) => {
    if (event.target === exportModal) closeExportModal();
  });
}
if (confirmModal) {
  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) closeConfirmModal();
  });
}
if (exportForm) {
  exportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = exportForm.elements.type.value;
    const start = exportForm.elements.start.value;
    const end = exportForm.elements.end.value;
    closeExportModal();
    applyExport(type, start, end);
  });
}
if (exportToday) {
  exportToday.addEventListener("click", () => {
    if (!exportForm) return;
    const today = new Date().toISOString().slice(0, 10);
    exportForm.elements.start.value = today;
    exportForm.elements.end.value = today;
  });
}

if (tableBody && window.__INITIAL_ITEMS__) {
  items = window.__INITIAL_ITEMS__;
  renderTable();
  delete window.__INITIAL_ITEMS__;
}

updateStatusOptionLabels();

if (searchInput && tableBody) {
  const params = new URLSearchParams(window.location.search);
  const clientFilter = params.get("client");
  if (clientFilter) {
    searchInput.value = clientFilter;
    renderTable();
  }
}

fetchItems();
fetchSummary();

if (tableBody) {
  window.addEventListener("pageshow", () => {
    fetchItems();
  });
  window.addEventListener("focus", () => {
    fetchItems();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchItems();
  });
}
