const scanInput = document.getElementById('scanInput');
const scanBody = document.getElementById('scanBody');

let scans = [];
let existingSerials = new Set();
let existingItems = {}; // map serial -> item object
let allInventoryItems = [];
let inventoryLoaded = false;
let maxStockNo = 0;
const STORAGE_KEY = 'ups_scanner_scans_v1';

const existsModal = document.getElementById('existsModal');
const existsOk = document.getElementById('existsOk');
const closeExists = document.getElementById('closeExists');

if (existsOk) existsOk.addEventListener('click', () => closeModal(existsModal));
if (closeExists) closeExists.addEventListener('click', () => closeModal(existsModal));

// Ensure OK button always closes the existsModal even if elements are created later
function wireExistsOk() {
  const em = document.getElementById('existsModal');
  let ok = document.getElementById('existsOk');
  if (!ok || !em) return false;
  try {
    // clone to remove previous listeners
    const newOk = ok.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    ok = newOk;
    ok.addEventListener('click', (ev) => {
      ev.stopPropagation();
      try { em.classList.remove('show'); em.setAttribute('aria-hidden','true'); } catch(e){}
      try { if (em && em.parentNode) em.parentNode.removeChild(em); } catch(e){}
    }, { once: true });
    try { ok.focus(); } catch(e){}
    return true;
  } catch (e) { return false; }
}
document.addEventListener('DOMContentLoaded', () => { wireExistsOk(); });

// Delegated click handler as robust fallback for OK button
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === 'existsOk' || t.closest && t.closest('#existsModal') && t.classList && t.classList.contains('primary')) {
    const em = document.getElementById('existsModal');
    if (em) {
      try { em.classList.remove('show'); em.setAttribute('aria-hidden','true'); } catch(e){}
      try { em.remove(); } catch(e){}
    }
  }
});

const scanEditModal = document.getElementById('scanEditModal');
const closeScanEdit = document.getElementById('closeScanEdit');
const scanEditForm = document.getElementById('scanEditForm');
const editSerial = document.getElementById('editSerial');
let editModel = document.getElementById('editModel');
let editClient = document.getElementById('editClient');
let editStatus = document.getElementById('editStatus');
const cancelEdit = document.getElementById('cancelEdit');
let editIndex = null;
let editItemId = null; // when editing an existing inventory item
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');
const closeItemModal = document.getElementById('closeModal');
const termsType = document.getElementById('termsType');
const termsDays = document.getElementById('termsDays');



async function loadInventorySerials() {
  try {
    const res = await fetch('/api/items?ts=' + Date.now());
    if (!res.ok) {
      // mark not loaded and clear caches
      inventoryLoaded = false;
      existingSerials = new Set();
      existingItems = {};
      return [];
    }
    const data = await res.json();
    const items = data.items || [];
    existingSerials = new Set(items.map(i => (i.serial_number || '').trim()));
    existingItems = {};
    items.forEach(i => {
      const s = (i.serial_number || '').trim();
      if (s) existingItems[s] = i;
    });
    allInventoryItems = items;
    // compute max stock no
    maxStockNo = items.reduce((max, it) => {
      const n = Number(String(it.stock_no || '').trim()) || 0;
      return n > max ? n : max;
    }, 0);
    inventoryLoaded = true;
    // notify listeners
    document.dispatchEvent(new Event('inventoryLoaded'));
    console.log('[barcode] loadInventorySerials fetched items:', items.length);
    return items;
  } catch (e) {
    inventoryLoaded = false;
    existingSerials = new Set();
    existingItems = {};
    return [];
  }
}

function formatTerms(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (raw.toUpperCase() === 'COD') return 'COD';
  const match = raw.match(/^(\d+)\s*(DAYS?)?$/i);
  if (match) return `${match[1]} days`;
  return raw;
}

function parseTerms(value) {
  if (!value) return { type: 'days', days: '' };
  const raw = String(value).trim();
  if (!raw) return { type: 'days', days: '' };
  if (raw.toUpperCase() === 'COD') return { type: 'cod', days: '' };
  const match = raw.match(/^(\d+)\s*(DAYS?)?$/i);
  if (match) return { type: 'days', days: match[1] };
  return { type: 'days', days: '' };
}

function updateTermsValue() {
  if (!itemForm) return;
  const termsField = itemForm.elements['terms'];
  if (!termsField) return;
  const type = termsType ? termsType.value : 'days';
  const termsRow = termsType ? termsType.closest('.terms-row') : null;

  if (type === 'cod') {
    if (termsRow) termsRow.classList.add('is-cod');
    if (termsDays) {
      termsDays.value = '';
      termsDays.disabled = true;
    }
    termsField.value = 'COD';
    return;
  }

  if (termsRow) termsRow.classList.remove('is-cod');
  if (termsDays) termsDays.disabled = false;
  const daysVal = termsDays ? String(termsDays.value || '').trim() : '';
  termsField.value = daysVal ? `${daysVal} days` : '';
}

function syncTermsFieldsFromValue(value) {
  if (!termsType || !termsDays) return;
  const parsed = parseTerms(value);
  termsType.value = parsed.type;
  termsDays.value = parsed.days;
  updateTermsValue();
}

function showModal(modal) {
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  // ensure OK button is wired and focused so first click closes
  try { wireExistsOk(); } catch(e) {}
  setTimeout(() => {
    try { const ok = document.getElementById('existsOk'); if (ok) { ok.focus(); } } catch(e) {}
  }, 10);
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

function prepareAndShowExists() {
  const existsOkBtn = document.getElementById('existsOk');
  const closeExistsBtn = document.getElementById('closeExists');
  const actionEl = document.getElementById('scanAction');
  const action = actionEl ? actionEl.value : '';
  // If current filter is 'new', keep OK enabled but hide Close button
  if (action === 'new') {
    if (existsOkBtn) existsOkBtn.disabled = false;
    if (closeExistsBtn) closeExistsBtn.style.display = 'none';
  } else {
    if (existsOkBtn) existsOkBtn.disabled = false;
    if (closeExistsBtn) closeExistsBtn.style.display = '';
  }
  showModal(existsModal);
}

function showMessage(title, msg) {
  const titleEl = document.getElementById('existsTitle');
  const msgEl = document.getElementById('existsMsg');
  const existsOkBtn = document.getElementById('existsOk');
  const closeExistsBtn = document.getElementById('closeExists');
  if (titleEl && msgEl) {
    titleEl.textContent = title || 'Notice';
    msgEl.textContent = msg || '';
    if (existsOkBtn) existsOkBtn.disabled = false;
    if (closeExistsBtn) closeExistsBtn.style.display = 'none';
    const em = document.getElementById('existsModal');
    if (em) { em.classList.add('show'); em.setAttribute('aria-hidden','false'); return; }
  }
  // fallback to native alert if modal missing
  alert((title ? title + '\n\n' : '') + (msg || ''));
}

function renderScans() {
  scanBody.innerHTML = '';
  const currentFilter = (document.getElementById('scanAction')||{}).value;
  scans.forEach((s, idx) => {
    const tr = document.createElement('tr');
    const flag = s.action === 'set_in_stock' ? '<span style="color:#b76f00;margin-right:8px">[Set → On Stock]</span>' : '';
    const applyBtn = s.action === 'set_in_stock' ? `<button class="ghost" data-action="apply-toggle" data-idx="${idx}">Apply</button>` : '';
    const detailsBtn = currentFilter === 'new' ? '' : `<button class="ghost" data-action="details" data-idx="${idx}">Details</button>`;
    tr.innerHTML = `
      <td>${flag}<input class="detail-input small" value="${s.code}" readonly onclick="this.select()" /></td>
      <td>
          ${detailsBtn}
          <button class="ghost edit" data-action="edit-item" data-idx="${idx}">Edit Item</button>
          ${applyBtn}
          <button class="ghost danger" data-action="remove" data-idx="${idx}">Remove</button>
      </td>
    `;
    scanBody.appendChild(tr);
  });
  // persist scans to localStorage so they survive navigation
  saveScansToStorage();
  updateInventoryCounts();
}

function ensureScanEditFields() {
  // If the scan edit modal should match item form options, clone selects from itemForm
  if (!itemForm) return;
  // model
  const modelSelect = itemForm.querySelector('select[name="model"]');
  const clientSelect = itemForm.querySelector('select[name="client"]');
  const statusSelect = itemForm.querySelector('select[name="status"]');
  const containerModel = editModel && editModel.parentElement;
  const containerClient = editClient && editClient.parentElement;
  const containerStatus = editStatus && editStatus.parentElement;
  if (modelSelect && containerModel) {
    // replace input with a select if not already a select
    if (editModel && editModel.tagName === 'INPUT') {
      const sel = modelSelect.cloneNode(true);
      sel.id = 'editModel'; sel.name = 'editModel';
      sel.value = editModel.value || '';
      containerModel.replaceChild(sel, editModel);
      editModel = document.getElementById('editModel');
    }
  }
  if (clientSelect && containerClient) {
    if (editClient && editClient.tagName === 'INPUT') {
      const sel = clientSelect.cloneNode(true);
      sel.id = 'editClient'; sel.name = 'editClient';
      sel.value = editClient.value || '';
      containerClient.replaceChild(sel, editClient);
      editClient = document.getElementById('editClient');
    }
  }
  if (statusSelect && containerStatus) {
    if (editStatus && editStatus.tagName !== 'SELECT') {
      const sel = statusSelect.cloneNode(true);
      sel.id = 'editStatus'; sel.name = 'editStatus';
      sel.value = editStatus.value || '';
      containerStatus.replaceChild(sel, editStatus);
      editStatus = document.getElementById('editStatus');
    }
  }
}

function populateInStockSelect() {
  const sel = document.getElementById('inStockSelect');
  if (!sel) return;
  console.log('[barcode] populateInStockSelect existingItems:', Object.keys(existingItems).length);
  sel.innerHTML = '';
  const opts = Object.values(existingItems).filter(i => (String(i.status||'').toUpperCase() === 'ON STOCK'));
  console.log('[barcode] populateInStockSelect found ON STOCK count:', opts.length);
  const parent = sel && sel.parentElement;
  if (opts.length === 0) {
    // hide the select and the Set Selected button when no items
    if (sel) sel.style.display = 'none';
    const btn = document.getElementById('setDeliveredBtn'); if (btn) btn.style.display = 'none';
    if (parent) {
      const placeholder = document.createElement('div'); placeholder.style.opacity = '.6'; placeholder.style.padding = '6px 10px'; placeholder.textContent = '(no in-stock items)';
      // remove old placeholder if exists
      const old = parent.querySelector('.no-items-placeholder'); if (old) old.remove();
      placeholder.classList.add('no-items-placeholder'); parent.appendChild(placeholder);
    }
    return;
  } else {
    // ensure visible
    sel.style.display = ''; const btn = document.getElementById('setDeliveredBtn'); if (btn) btn.style.display = '';
    const old = parent && parent.querySelector('.no-items-placeholder'); if (old) old.remove();
  }
  opts.forEach(it => {
    const o = document.createElement('option');
    o.value = String(it.serial_number || '');
    o.textContent = `${it.serial_number || ''} — ${it.model || ''}`;
    sel.appendChild(o);
  });
}

function updateInventoryCounts() {
  const el = document.getElementById('inventoryCounts');
  if (!el) return;
  const all = allInventoryItems || Object.values(existingItems);
  const inStock = all.filter(i => String(i.status||'').toUpperCase() === 'ON STOCK').length;
  const delivered = all.filter(i => String(i.status||'').toUpperCase() === 'DELIVERED').length;
  const newScans = scans.length || 0;
  el.textContent = `On stock: ${inStock} · Delivered: ${delivered} · New: ${newScans}`;
}

function renderStatusTable(statusFilter) {
  const tbody = document.getElementById('scanBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const target = String(statusFilter || '').toUpperCase();
  console.log('[barcode] renderStatusTable target=', target, 'existingItems=', Object.keys(existingItems).length);
  const rows = allInventoryItems.filter(i => String(i.status||'').trim().toUpperCase() === String(target||'').trim().toUpperCase());
  console.log('[barcode] renderStatusTable rows matched=', rows.length);
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2" style="opacity:.6">(no items with status: ${statusFilter || '(none)'})</td>`;
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((it, idx) => {
    const tr = document.createElement('tr');
    const displayVal = it.serial_number && String(it.serial_number).trim() ? it.serial_number : (it.stock_no || it.code || 'N/A');
    const dataSerial = it.serial_number && String(it.serial_number).trim() ? it.serial_number : '';
    tr.innerHTML = `
      <td><input class="detail-input small" value="${displayVal}" readonly onclick="this.select()" /></td>
      <td>
        <button class="ghost" data-action="details" data-serial="${dataSerial}">Details</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// show details in details modal including brand/system and category
document.addEventListener('click', (ev) => {
  const btn = ev.target && ev.target.closest && ev.target.closest('button[data-action="details"]');
  if (!btn) return;
  const serial = btn.getAttribute('data-serial') || '';
  const item = existingItems[String(serial).trim()];
  if (!item) return showMessage('Not found', 'Item not found in inventory');
  // populate modal fields
  try {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    set('d_stock_no', item.stock_no);
    set('d_code', item.code);
    set('d_system', item.system);
    set('d_model', item.model);
    set('d_rating', item.rating);
    set('d_status', item.status);
    // category badge
    try {
      const badge = document.getElementById('d_category_badge');
      if (badge) {
        const cat = (item.category || '').trim();
        badge.textContent = cat || 'N/A';
        badge.className = 'badge-category ' + (cat.toUpperCase() === 'UPS' ? 'badge-ups' : (cat.toUpperCase() === 'AVR' ? 'badge-avr' : ''));
      }
    } catch (e) {}
    set('d_serial_number', item.serial_number);
    set('d_client', item.client);
    set('d_date_acquired', item.date_acquired);
    set('d_date_installed', item.date_installed);
    set('d_dr_no', item.dr_no);
    set('d_si_no', item.si_no);
    set('d_po', item.po);
    set('d_value_vat_ex', item.value_vat_ex);
    set('d_warranty', item.warranty);
    set('d_terms', formatTerms(item.terms));
    set('d_remarks', item.remarks);
    // ensure details modal visible
    const dm = document.getElementById('detailsModal'); if (dm) { dm.classList.add('show'); dm.setAttribute('aria-hidden','false'); }
  } catch (e) {
    console.error('[barcode] failed to open details', e);
  }
});

function renderFindPlaceholder() {
  const tbody = document.getElementById('scanBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  tr.innerHTML = `<td colspan="2" style="opacity:.6">Scan a barcode to find it in inventory.</td>`;
  tbody.appendChild(tr);
}

function renderFindResult(serial) {
  const tbody = document.getElementById('scanBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const it = existingItems[String(serial).trim()];
  if (!it) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2" style="opacity:.6">Barcode ${serial} not found in inventory.</td>`;
    tbody.appendChild(tr);
    return;
  }
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="detail-input small" value="${it.serial_number || ''}" readonly onclick="this.select()" /></td>
    <td>
      <button class="ghost" data-action="details" data-serial="${it.serial_number || ''}">Details</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function getSelectedScanClient() {
  const sel = document.getElementById('scanClientSelect');
  return sel ? String(sel.value || '').trim() : '';
}

function saveScansToStorage() {
  try {
    const payload = scans.map(s => ({ code: s.code, model: s.model || '', client: s.client || '', status: s.status || '' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // ignore storage errors
  }
}

function loadScansFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      scans = data.map(s => ({ code: s.code, model: s.model || '', client: s.client || '', status: s.status || '' }));
    }
  } catch (e) {
    scans = [];
  }
}

function addScan(code) {
  if (!code) return;
  // ensure inventory serials are loaded
  (async function(){
    if (!inventoryLoaded) await loadInventorySerials();
    const actionElDbg = document.getElementById('scanAction');
    const actionDbg = actionElDbg ? actionElDbg.value : '';
    const toggleDbg = document.getElementById('setToDeliveredToggle');
    console.log('[barcode] addScan()', code, 'action=', actionDbg, 'toggleChecked=', !!(toggleDbg && toggleDbg.checked));
    const actionEl = document.getElementById('scanAction');
    const action = actionEl ? actionEl.value : '';
    // normalize action (allow both 'in_stock' and 'in stock')
    const normAction = String(action || '').trim().toLowerCase().replace(/\s+/g, '_');
    const key = String(code).trim();
    const setDeliveredToggle = document.getElementById('setToDeliveredToggle');
    const toggleOn = (setDeliveredToggle && setDeliveredToggle.checked) && normAction === 'in_stock';
    // when the toggle is ON in the in-stock filter, set the item to DELIVERED
    let desiredStatus = null;
    if (toggleOn) {
      desiredStatus = 'DELIVERED';
    }
    // prevent adding the same barcode multiple times in the current scan list
    if (scans.some(s => String(s.code || '').trim() === key)) {
      const msg = document.getElementById('existsMsg');
      const title = document.getElementById('existsTitle');
      if (msg) msg.textContent = `Barcode ${key} has already been scanned.`;
      if (title) title.textContent = 'Duplicate';
      prepareAndShowExists();
      return;
    }
    // If filter is 'find', show the found item in the table (Details action)
    if (normAction === 'find') {
      if (existingSerials.has(key)) {
        renderFindResult(key);
      } else {
        const msg = document.getElementById('existsMsg');
        const title = document.getElementById('existsTitle');
        if (msg) msg.textContent = `Barcode ${key} not found in inventory.`;
        if (title) title.textContent = 'Not found';
        prepareAndShowExists();
      }
      return;
    }

    // If barcode exists in inventory (non-find flows)
    const selectedClient = getSelectedScanClient();
    if (existingSerials.has(key)) {
      const item = existingItems[key];
      if (item) {
        // if toggle 'Set to Delivered' is on, update immediately
        if (desiredStatus) {
          console.log('[barcode] desiredStatus set for', key, '->', desiredStatus, 'client=', selectedClient);
          try {
            const putPayload = buildPutPayload(item, { status: desiredStatus, client: selectedClient || item.client });
            console.log('[barcode] item before PUT', item);
            console.log('[barcode] sending PUT for', item.id, putPayload);
            const resp = await fetch(`/api/items/${item.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(putPayload) });
            let bodyText = '';
            try { bodyText = await resp.text(); } catch (e) { bodyText = '<unreadable response body>'; }
            console.log('[barcode] PUT response status', resp.status, 'body:', bodyText);
            if (resp.ok) {
              // Optimistically remove the item from the current cache/view immediately
              try {
                const delKey = String(item.serial_number || key || '').trim();
                delete existingItems[delKey];
              } catch (e) { console.warn('[barcode] failed to delete cache key', e); }
              const cur = (document.getElementById('scanAction')||{}).value;
              const curNorm = String(cur||'').trim().toLowerCase().replace(/\s+/g, '_');
              if (curNorm === 'in_stock') renderStatusTable('ON STOCK');
              else renderScans();
              // then refresh inventory cache in background to stay consistent
              loadInventorySerials().catch(()=>{});
            } else {
              const msg = document.getElementById('existsMsg'); if (msg) msg.textContent = `Failed to set ${key} to ${desiredStatus}`;
              console.error('[barcode] PUT failed non-OK', resp.status, bodyText);
              prepareAndShowExists();
            }
          } catch (err) {
            console.error('[barcode] PUT failed', err);
            const msg = document.getElementById('existsMsg'); if (msg) msg.textContent = `Failed to set ${key} to ${desiredStatus}`;
            prepareAndShowExists();
          }
          return;
        }
        // show details for existing items when toggle is not used
        showDetailsForCode(key);
        return;
      }
    }
    // for new scans, if set-delivered toggle is on, mark as delivered in queue and preserve selected client
    if (desiredStatus) scans.push({ code: key, status: desiredStatus, client: selectedClient });
    else scans.push({ code: key, status: '', client: '' });
    renderScans();
  })();
}

// Re-enable hidden scan input for keyboard-emulating barcode scanners
if (scanInput) {
  scanInput.focus();
  scanInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = scanInput.value.trim();
      if (val) addScan(val);
      scanInput.value = '';
      scanInput.focus();
    }
  });
}

// Global capture fallback for scanners that emulate keyboard but focus may be lost.
// This buffers quick key events and treats an Enter as end-of-scan.
(() => {
  let scanBuffer = '';
  let lastKeyTime = 0;
  const GAP = 100; // ms between chars to reset buffer
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (isTyping) return; // don't interfere with manual typing
    const now = Date.now();
    if (now - lastKeyTime > GAP) scanBuffer = '';
    lastKeyTime = now;
    if (e.key === 'Enter') {
      if (scanBuffer) {
        addScan(scanBuffer);
        scanBuffer = '';
        e.preventDefault();
      }
    } else if (e.key && e.key.length === 1) {
      scanBuffer += e.key;
    }
  });
})();

// delegate input changes and remove
document.addEventListener('input', (e) => {
  const el = e.target;
  const idx = el.getAttribute && el.getAttribute('data-idx');
  const field = el.getAttribute && el.getAttribute('data-field');
  if (idx !== null && field) {
    scans[Number(idx)][field] = el.value;
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const idx = btn.getAttribute('data-idx');
  if (action === 'remove' && idx !== null) {
    scans.splice(Number(idx), 1);
    renderScans();
  }
  if (action === 'edit-item' && idx !== null) {
    const i = Number(idx);
    if (!Number.isFinite(i)) return;
    editIndex = i;
    editItemId = null;
    const s = scans[i] || {};
    // Open the full item modal prefilled from the scanned row so Edit looks like Add Item
    openItemModalForScan(i);
    return;
  }
  if (action === 'details' && idx !== null) {
    const code = scans[Number(idx)].code;
    showDetailsForCode(code);
  }
  // handle details button from in-stock table (uses data-serial)
  if (action === 'details' && btn.getAttribute('data-serial')) {
    const serial = btn.getAttribute('data-serial');
    showDetailsForCode(serial);
  }
  // status-change buttons removed; only Details action remains
});

// per-row edit is handled inline in the main click handler above.

  async function showDetailsForCode(code) {
    if (!inventoryLoaded) await loadInventorySerials();
    let item = existingItems[String(code).trim()];
    if (!item) {
      // try reloading inventory once (in case cache stale)
      await loadInventorySerials();
      item = existingItems[String(code).trim()];
      if (!item) {
        const msg = document.getElementById('existsMsg');
          const title = document.getElementById('existsTitle');
        if (msg) msg.textContent = `Details not found for ${code}`;
          if (title) title.textContent = 'Not found';
        prepareAndShowExists();
        return;
      }
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    set('d_stock_no', item.stock_no);
    set('d_code', item.code);
    set('d_system', item.system);
    set('d_model', item.model);
    set('d_rating', item.rating);
    set('d_status', item.status);
    set('d_serial_number', item.serial_number);
    set('d_client', item.client);
    set('d_date_acquired', item.date_acquired);
    set('d_date_installed', item.date_installed);
    set('d_dr_no', item.dr_no);
    set('d_si_no', item.si_no);
    set('d_po', item.po);
    set('d_value_vat_ex', item.value_vat_ex ? '₱ ' + item.value_vat_ex : 'N/A');
    set('d_warranty', item.warranty);
    set('d_terms', item.terms ? formatTerms(item.terms) : 'N/A');
    set('d_remarks', item.remarks);
    showModal(document.getElementById('detailsModal'));
  }

async function saveOne(item) {
  // minimal payload: serial_number + model + client + status
  // include a reserved stock_no to avoid duplicates: increment maxStockNo now
  const stockNo = Number(maxStockNo || 0) + 1;
  const payload = {
    stock_no: String(stockNo),
    serial_number: item.code,
    model: item.model || '',
    client: item.client || '',
    status: item.status || ''
  };
  // reserve locally
  maxStockNo = stockNo;
  try {
    const resp = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      // rollback reservation
      maxStockNo = Math.max(0, Number(maxStockNo) - 1);
      return false;
    }
    return true;
  } catch (err) {
    maxStockNo = Math.max(0, Number(maxStockNo) - 1);
    return false;
  }
}

// Removed Save All bulk-save behavior to prevent saving incomplete scans.

// Auto-focus the scan input when page loads and when clicking non-interactive parts of the panel
document.addEventListener('click', (e) => {
  if (!e || !e.target) return;
  // if clicking interactive controls, don't steal focus
  if (e.target.closest && e.target.closest('select, button, input, textarea, a')) return;
  if (e.target.closest && e.target.closest('.panel')) scanInput && scanInput.focus();
});

// allow Escape to close modals (including existsModal)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const em = document.getElementById('existsModal');
    if (em && em.classList.contains('show')) return closeModal(em);
    const dm = document.getElementById('detailsModal');
    if (dm && dm.classList.contains('show')) return closeModal(dm);
    const sm = document.getElementById('scanEditModal');
    if (sm && sm.classList.contains('show')) return closeModal(sm);
  }
});

// (Set Selected / Find handlers defined later)

// Scan edit modal handlers
if (closeScanEdit) closeScanEdit.addEventListener('click', () => closeModal(scanEditModal));
if (cancelEdit) cancelEdit.addEventListener('click', () => closeModal(scanEditModal));

if (scanEditForm) {
  scanEditForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const payload = {
      serial_number: editSerial.value.trim(),
      model: editModel.value.trim(),
      client: editClient.value.trim(),
      status: editStatus.value.trim()
    };
    // quick duplicate check against inventory
    if (!inventoryLoaded) await loadInventorySerials();
      // If editing an existing inventory item, update via PUT
      if (editItemId) {
        try {
          // merge existing item with edits to avoid wiping fields
          const orig = existingItems[payload.serial_number] || {};
          const putPayload = {
            stock_no: orig.stock_no || '',
            code: orig.code || '',
            system: orig.system || '',
            model: payload.model || orig.model || '',
            rating: orig.rating || '',
            status: payload.status || orig.status || '',
            serial_number: payload.serial_number || orig.serial_number || '',
            client: payload.client || orig.client || '',
            date_acquired: orig.date_acquired || '',
            date_installed: orig.date_installed || '',
            dr_no: orig.dr_no || '',
            si_no: orig.si_no || '',
            po: orig.po || '',
            value_vat_ex: orig.value_vat_ex || '',
            warranty: orig.warranty || '',
            terms: orig.terms || '',
            remarks: orig.remarks || ''
          };
          const resp = await fetch(`/api/items/${editItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(putPayload)
          });
          if (!resp.ok) throw new Error('update failed');
          // refresh inventory cache
          await loadInventorySerials();
          renderScans();
          closeModal(scanEditModal);
          editItemId = null;
        } catch (err) {
          showMessage('Update failed', 'Update failed');
        }
        return;
      }

      // save new scanned item
        // client-side validation for scan edit save: require serial_number and status only
        const requiredScan = ['serial_number','status'];
        const missingScan = requiredScan.filter(f => !payload[f] || String(payload[f]).trim() === '');
        if (missingScan.length > 0) {
          console.warn('[barcode] missing required fields for scan save:', missingScan, payload);
          const labels = missingScan.map(m => ({serial_number:'Serial Number',status:'Status'}[m]||m));
          showMessage('Please fill required fields', 'Please fill required fields before saving: ' + labels.join(', '));
          return;
        }

        const ok = await saveOne({ code: payload.serial_number, model: payload.model, client: payload.client, status: payload.status });
      if (ok) {
        existingSerials.add(payload.serial_number);
        // remove the edited row from scans
        if (Number.isFinite(editIndex)) {
          scans.splice(editIndex, 1);
        }
        renderScans();
        closeModal(scanEditModal);
      } else {
        showMessage('Save failed', 'Save failed');
      }
  });
}

// Details modal handlers
const closeDetails = document.getElementById('closeDetails');
const detailsCloseOk = document.getElementById('detailsCloseOk');
if (closeDetails) closeDetails.addEventListener('click', () => closeModal(document.getElementById('detailsModal')));
if (detailsCloseOk) detailsCloseOk.addEventListener('click', () => closeModal(document.getElementById('detailsModal')));

// initialize inventory cache
// load scans from storage then inventory
loadScansFromStorage();
renderScans();

// Ensure inventory is loaded and then render appropriate view
loadInventorySerials().then(() => {
  populateInStockSelect();
  const action = getScanActionNorm();
  try { const el = document.getElementById('scanAction'); console.log('[barcode] scanAction element after load:', el, 'value=', el && el.value, 'selectedIndex=', el && el.selectedIndex, 'options=', el && Array.from(el.options).map(o=>o.value)); } catch(e){}
  if (action === 'in_stock') renderStatusTable('ON STOCK');
  else if (action === 'delivered') renderStatusTable('DELIVERED');
  else if (action === 'find') renderFindPlaceholder();
  else renderScans();
}).catch(() => {
  // fallback: still attempt to populate after short delay
  setTimeout(() => { populateInStockSelect(); renderScans(); }, 800);
});

// update counts after initial load
document.addEventListener('inventoryLoaded', updateInventoryCounts);
// also call once now in case already loaded
updateInventoryCounts();

// refresh table when inventoryLoaded event fires
document.addEventListener('inventoryLoaded', () => {
  populateInStockSelect();
  const action = getScanActionNorm();
  if (action === 'in_stock') renderStatusTable('ON STOCK');
  else if (action === 'delivered') renderStatusTable('DELIVERED');
  else if (action === 'find') renderFindPlaceholder();
  else renderScans();
});

// refresh view when scanAction changes
const scanActionEl = document.getElementById('scanAction');
if (scanActionEl) scanActionEl.addEventListener('change', () => {
  try { const el = document.getElementById('scanAction'); console.log('[barcode] scanAction change event element:', el, 'value=', el && el.value, 'selectedIndex=', el && el.selectedIndex, 'options=', el && Array.from(el.options).map(o=>o.value)); } catch(e){}
  // update visibility/label based on new filter
  updateToggleVisibility();
  const action = getScanActionNorm();
  if (action === 'in_stock') renderStatusTable('ON STOCK');
  else if (action === 'new') renderScans();
  else if (action === 'delivered') renderStatusTable('DELIVERED');
  else if (action === 'find') renderFindPlaceholder();
  else renderScans();
});

// show/hide the Set-to-Delivered toggle depending on filter
const setToggle = document.getElementById('setToDeliveredToggle');
function updateToggleVisibility() {
  const action = getScanActionNorm();
  if (!setToggle) return;
  const label = document.getElementById('setToLabel');
  const clientLabel = document.getElementById('scanClientLabel');
  if (action === 'in_stock') {
    setToggle.parentElement.style.display = '';
    if (clientLabel) clientLabel.style.display = 'inline-flex';
    if (label) label.textContent = 'Set to: Delivered';
  } else {
    setToggle.parentElement.style.display = 'none';
    if (clientLabel) clientLabel.style.display = 'none';
  }
}
updateToggleVisibility();
if (scanActionEl) scanActionEl.addEventListener('change', updateToggleVisibility);

// Apply single per-row toggle to On Stock
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  if (action === 'apply-toggle') {
    const idx = Number(btn.getAttribute('data-idx'));
    if (!Number.isFinite(idx)) return;
    const s = scans[idx];
    if (!s || s.action !== 'set_in_stock') return;
    // find item id
    if (!inventoryLoaded) await loadInventorySerials();
    const item = existingItems[String(s.code).trim()];
    if (!item) { showMessage('Item not found', 'Item not found'); return; }
    try {
      const putPayload = buildPutPayload(item, { status: 'ON STOCK' });
      console.log('[barcode] apply-toggle: sending PUT for', item.id, putPayload);
      const resp = await fetch(`/api/items/${item.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(putPayload) });
      let bodyText = '';
      try { bodyText = await resp.text(); } catch (e) { bodyText = '<unreadable response body>'; }
      console.log('[barcode] apply-toggle PUT status', resp.status, 'body:', bodyText);
      if (!resp.ok) throw new Error('update failed');
      // refresh and remove from scans
      await loadInventorySerials();
      scans.splice(idx, 1);
      renderScans();
      renderStatusTable('ON STOCK');
    } catch (err) { console.error('[barcode] apply-toggle failed', err); showMessage('Update failed', 'Update failed'); }
  }
});

// Apply Batch (all queued toggles)
const applyBatchBtn = document.getElementById('applyBatchBtn');
if (applyBatchBtn) applyBatchBtn.addEventListener('click', async () => {
  const toApply = scans.map((s, i) => ({ s, i })).filter(x => x.s && x.s.action === 'set_in_stock');
  if (toApply.length === 0) return showMessage('No changes', 'No queued changes to apply');
  if (!confirm(`Apply ${toApply.length} change(s) and set to On Stock?`)) return;
  for (let k = toApply.length - 1; k >= 0; k--) {
    const { s, i } = toApply[k];
    try {
      if (!inventoryLoaded) await loadInventorySerials();
      const item = existingItems[String(s.code).trim()];
      if (!item) continue;
      const putPayload = buildPutPayload(item, { status: 'ON STOCK' });
      console.log('[barcode] batch: sending PUT for', item.id, putPayload);
      const resp = await fetch(`/api/items/${item.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(putPayload) });
      let bodyText = '';
      try { bodyText = await resp.text(); } catch (e) { bodyText = '<unreadable response body>'; }
      console.log('[barcode] batch PUT status', resp.status, 'body:', bodyText);
      if (resp.ok) {
        scans.splice(i, 1);
      }
    } catch (err) {
      console.error('batch update failed for', s.code, err);
    }
  }
  await loadInventorySerials();
  renderScans();
  renderStatusTable('ON STOCK');
});

// when inventory finishes loading, repopulate select
document.addEventListener('inventoryLoaded', populateInStockSelect);

// manual refresh button removed from UI

// Set selected in-stock item to Delivered
const setDeliveredBtn = document.getElementById('setDeliveredBtn');
if (setDeliveredBtn) {
  setDeliveredBtn.addEventListener('click', async () => {
    const sel = document.getElementById('inStockSelect');
    if (!sel) return; const code = sel.value; if (!code) return showMessage('No item selected', 'No item selected');
    const item = existingItems[code]; if (!item) return showMessage('Item not found', 'Item not found');
    try {
      const selectedClient = getSelectedScanClient();
      const putPayload = buildPutPayload(item, { status: 'DELIVERED', client: selectedClient || item.client });
      console.log('[barcode] setDeliveredBtn: sending PUT for', item.id, putPayload);
      const resp = await fetch(`/api/items/${item.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(putPayload) });
      let bodyText = '';
      try { bodyText = await resp.text(); } catch (e) { bodyText = '<unreadable response body>'; }
      console.log('[barcode] setDeliveredBtn PUT status', resp.status, 'body:', bodyText);
      if (!resp.ok) throw new Error('update failed');
      await loadInventorySerials(); populateInStockSelect();
      showMessage('Set to Delivered', `Item ${code} set to Delivered`);
    } catch (err) { console.error('[barcode] setDeliveredBtn failed', err); showMessage('Update failed', 'Update failed'); }
  });
}

// Find button shows details for scanned barcode or chosen code
const findBtn = document.getElementById('findBtn');
if (findBtn) {
  findBtn.addEventListener('click', async () => {
    let code = '';
    const sel = document.getElementById('inStockSelect');
    if (sel && sel.value) code = sel.value;
    if (!code) {
      code = prompt('Enter barcode to find:');
      if (!code) return;
    }
    if (!inventoryLoaded) await loadInventorySerials();
    const item = existingItems[String(code).trim()];
    if (item) {
      editItemId = Number(item.id);
      if (editSerial) editSerial.value = item.serial_number || '';
      if (editModel) editModel.value = item.model || '';
      if (editClient) editClient.value = item.client || '';
        const msg = document.getElementById('existsMsg');
      showModal(scanEditModal);
    } else {
      showMessage('Not found', 'Barcode not found in inventory.');
    }
  });
}

let activeScanIndex = null;

function getScanActionNorm() {
  const el = document.getElementById('scanAction');
  const v = el ? el.value : '';
  return String(v||'').trim().toLowerCase().replace(/\s+/g,'_');
}

// Build a PUT payload matching server's expected fields and coerce values to strings
function buildPutPayload(item, overrides) {
  const fields = [
    'stock_no','code','system','model','rating','status','serial_number','client',
    'category',
    'date_acquired','date_installed','dr_no','si_no','po','value_vat_ex','warranty','terms','remarks'
  ];
  const payload = {};
  fields.forEach(f => {
    let v = '';
    try { v = item && (item[f] !== undefined && item[f] !== null) ? String(item[f]) : ''; } catch (e) { v = '' }
    payload[f] = v;
  });
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(k => { payload[k] = String(overrides[k] === undefined || overrides[k] === null ? '' : overrides[k]); });
  }
  return payload;
}

function openItemModalForScan(idx) {
  if (!itemModal || !itemForm) return;
  itemForm.reset();
  activeScanIndex = idx;
  if (modalTitle) modalTitle.textContent = 'Add Item (from scan)';
  // set next stock #
  const nextStock = Number(maxStockNo || 0) + 1;
  if (itemForm.elements['stock_no']) itemForm.elements['stock_no'].value = String(nextStock);
  // set serial number from scan
  const s = scans[idx];
  if (itemForm.elements['serial_number']) itemForm.elements['serial_number'].value = s.code || '';
  syncTermsFieldsFromValue('');
  showModal(itemModal);
}

if (closeItemModal) closeItemModal.addEventListener('click', () => closeModal(itemModal));

if (termsType) termsType.addEventListener('change', updateTermsValue);
if (termsDays) termsDays.addEventListener('input', updateTermsValue);

// Ensure the Save button in item modal triggers the form submit reliably
const itemSaveBtn = document.getElementById('itemSaveBtn');
if (itemSaveBtn && itemForm) {
  itemSaveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // prefer requestSubmit if available to trigger validation and submit handlers
    try {
      if (typeof itemForm.requestSubmit === 'function') itemForm.requestSubmit();
      else itemForm.submit();
    } catch (err) {
      console.error('[barcode] itemSaveBtn submit failed', err);
    }
  });
}

if (itemForm) {
  itemForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    updateTermsValue();
    // gather payload from form fields
    const payload = {};
    Array.from(itemForm.elements).forEach((el) => {
      if (!el.name) return;
      payload[el.name] = el.value;
    });
    // ensure numeric stock
    payload.stock_no = String(payload.stock_no || (maxStockNo + 1));
    // client-side validation: require only status and serial_number before saving
    const required = ['status','serial_number'];
    const missing = required.filter(f => !payload[f] || String(payload[f]).trim() === '');
    if (missing.length > 0) {
      console.warn('[barcode] missing required fields:', missing, payload);
      const labels = missing.map(m => ({status:'Status',serial_number:'Serial Number'}[m]||m));
      // visually mark missing fields
      missing.forEach((m) => {
        const el = itemForm.querySelector(`[name="${m}"]`);
        if (el) {
          el.style.outline = '2px solid #d9534f';
        }
      });
      // focus first missing
      const first = missing[0];
      const firstEl = itemForm.querySelector(`[name="${first}"]`);
      if (firstEl && typeof firstEl.focus === 'function') firstEl.focus();
      showMessage('Please fill required fields', 'Please fill required fields before saving: ' + labels.join(', '));
      return;
    }
    try {
      // reserve stock_no if not provided
      let stockNoToUse = payload.stock_no && String(payload.stock_no).trim() ? Number(payload.stock_no) : (Number(maxStockNo || 0) + 1);
      payload.stock_no = String(stockNoToUse);
      // reserve locally before posting to avoid race
      maxStockNo = Math.max(Number(maxStockNo || 0), stockNoToUse);

      const resp = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        let text = '';
        try { text = await resp.text(); } catch (e) { text = '<unreadable response>'; }
        console.error('[barcode] itemForm save failed', resp.status, text);
        // rollback reservation
        maxStockNo = Math.max(0, Number(maxStockNo) - 1);
        throw new Error('save failed');
      }
      // succeeded
      existingSerials.add(String(payload.serial_number || '').trim());
      maxStockNo = Math.max(maxStockNo, Number(payload.stock_no) || 0);
      // remove the scanned row if present
      if (Number.isFinite(activeScanIndex)) {
        scans.splice(activeScanIndex, 1);
      }
      renderScans();
      closeModal(itemModal);
      // refresh inventory cache and update UI so the newly created/updated
      // item appears immediately in the active filter view
      try {
        await loadInventorySerials();
        populateInStockSelect();
        const action = getScanActionNorm();
        if (action === 'in_stock') renderStatusTable('ON STOCK');
        else if (action === 'find') renderFindPlaceholder();
        else renderScans();
      } catch (e) {
        // ignore refresh errors
      }
    } catch (err) {
      showMessage('Save failed', 'Save failed.');
    }
  });
}
