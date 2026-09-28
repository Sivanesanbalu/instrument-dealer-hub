// All-in-One Instrument Search & Broadcast Engine (Full India Master Edition)

let currentSearchResults = [];
let allQuotes = [];
let selectedSupplierIds = new Set();
let activeTypeFilter = '';
let activeStateFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  fetchQuotes();
  // Auto-search default popular instrument on load
  quickSearch('Rosemount 3051', 52000, 'https://youtube.com/watch?v=k5_c8L-zQ1g');
});

// ----------------- UNIFIED SEARCH EXECUTION -----------------
async function handleMainSearch(e) {
  if (e) e.preventDefault();
  const query = document.getElementById('mainSearchInput')?.value.trim();
  if (!query) {
    showToast('Please enter an instrument model or name', 'warning');
    return;
  }
  executeUnifiedSearch(query);
}

function quickSearch(model, defaultPrice, videoUrl, defaultSpecs, defaultQty) {
  document.getElementById('mainSearchInput').value = model;
  document.getElementById('rfqProductName').value = model;
  document.getElementById('rfqProductModel').value = model;
  if (defaultPrice && document.getElementById('rfqTargetPrice')) document.getElementById('rfqTargetPrice').value = defaultPrice;
  if (videoUrl && document.getElementById('rfqVideoUrl')) document.getElementById('rfqVideoUrl').value = videoUrl;
  if (defaultSpecs && document.getElementById('rfqSpecs')) document.getElementById('rfqSpecs').value = defaultSpecs;
  if (defaultQty && document.getElementById('rfqQuantity')) document.getElementById('rfqQuantity').value = defaultQty;

  executeUnifiedSearch(model);
}

async function executeUnifiedSearch(query) {
  const btn = document.getElementById('searchSubmitBtn');
  const tbody = document.getElementById('searchResultsTableBody');
  const searchLabel = document.getElementById('currentSearchLabel');

  if (searchLabel) searchLabel.innerText = query;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Searching All India...`;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-10 text-slate-500">
        <i class="fa-solid fa-satellite-dish text-2xl text-blue-600 animate-pulse block mb-2"></i>
        Scanning IndiaMART, OEM Manufacturers, and Indian Stockists across Tamil Nadu, Maharashtra, Gujarat, Karnataka, Delhi NCR...
      </td>
    </tr>
  `;

  try {
    const res = await fetch('/api/search-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-globe"></i> Search All India`;
    }

    if (data.success && data.data) {
      currentSearchResults = data.data;

      // Select all found by default
      selectedSupplierIds.clear();
      currentSearchResults.forEach(s => selectedSupplierIds.add(s.id));

      updateCounts(data.summary || {});
      renderSearchResultsTable();
      updateSelectedBar();

      showToast(`Found ${data.count} verified suppliers across India for "${query}"!`, 'success');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-globe"></i> Search All India`;
    }
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-red-500">Search error: ${err.message}</td></tr>`;
  }
}

// ----------------- RESULTS TABLE & FILTERING -----------------
function updateCounts(summary) {
  const allCount = currentSearchResults.length;
  const oemCount = currentSearchResults.filter(s => s.source === 'OEM Manufacturer').length;
  const dealerCount = currentSearchResults.filter(s => s.source === 'Authorized Dealer').length;
  const imCount = currentSearchResults.filter(s => s.source.includes('IndiaMART') || s.source === 'TradeIndia').length;

  document.getElementById('countAll').innerText = allCount;
  document.getElementById('countOem').innerText = oemCount;
  document.getElementById('countDealers').innerText = dealerCount;
  document.getElementById('countIndiaMart').innerText = imCount;
}

function filterTableBySource(type) {
  activeTypeFilter = type;

  document.querySelectorAll('.filter-tab').forEach(btn => {
    const t = btn.getAttribute('data-type');
    if (t === type) {
      btn.className = 'filter-tab px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-sm';
    } else {
      btn.className = 'filter-tab px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    }
  });

  renderSearchResultsTable();
}

function filterTableByState(state) {
  activeStateFilter = state;
  renderSearchResultsTable();
}

function getFilteredResults() {
  let list = currentSearchResults;

  if (activeTypeFilter) {
    if (activeTypeFilter === 'IndiaMART') {
      list = list.filter(s => s.source.includes('IndiaMART') || s.source === 'TradeIndia' || s.source === 'Live Web Discovered');
    } else {
      list = list.filter(s => s.source === activeTypeFilter);
    }
  }

  if (activeStateFilter) {
    const qState = activeStateFilter.toLowerCase();
    list = list.filter(s => 
      (s.state || '').toLowerCase().includes(qState) || 
      (s.city || '').toLowerCase().includes(qState)
    );
  }

  return list;
}

function renderSearchResultsTable() {
  const tbody = document.getElementById('searchResultsTableBody');
  const filtered = getFilteredResults();
  const countLabel = document.getElementById('resultsCountLabel');

  if (countLabel) {
    countLabel.innerText = `• Showing ${filtered.length} of ${currentSearchResults.length} suppliers`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400">
          No suppliers found matching this category.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isSelected = selectedSupplierIds.has(s.id);

    // Type Badge
    let typeBadge = '';
    if (s.source === 'OEM Manufacturer') {
      typeBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
        <i class="fa-solid fa-industry"></i> OEM Manufacturer
      </span>`;
    } else if (s.source.includes('IndiaMART')) {
      typeBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
        <span class="bg-orange-600 text-white rounded px-1 text-[9px] font-black">IM</span> IndiaMART Verified
      </span>`;
    } else if (s.source === 'TradeIndia') {
      typeBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
        <i class="fa-solid fa-truck-ramp-box"></i> TradeIndia Trust
      </span>`;
    } else if (s.source === 'Live Web Discovered') {
      typeBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
        <i class="fa-solid fa-globe"></i> Live Web Discovered
      </span>`;
    } else {
      typeBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        <i class="fa-solid fa-store"></i> Authorized Stockist
      </span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50/40' : ''}">
        <td class="p-3 text-center">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectSupplier('${s.id}')" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer">
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-900 text-xs">${s.companyName}</div>
          <div class="mt-1 flex items-center gap-1.5">${typeBadge}</div>
          ${s.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">${s.notes}</div>` : ''}
        </td>
        <td class="p-3 whitespace-nowrap">
          <div class="font-bold text-slate-800">${s.city || 'India'}</div>
          <div class="text-slate-400 text-[10px]">${s.state || ''}</div>
        </td>
        <td class="p-3 whitespace-nowrap">
          <div class="font-mono text-xs font-semibold text-slate-700">${s.gstin || 'Active Online'}</div>
          <button onclick="openAuditModal('${s.id}')" class="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 mt-1 transition">
            <i class="fa-solid fa-shield-halved"></i> ${s.verificationDetails?.trustScore || 'Verified'}
          </button>
        </td>
        <td class="p-3 whitespace-nowrap space-y-0.5">
          <div class="flex items-center gap-1 text-slate-800 font-medium">
            <i class="fa-brands fa-whatsapp text-emerald-600 text-xs"></i>
            <span>+${s.whatsapp || s.phone}</span>
          </div>
          <div class="flex items-center gap-1 text-slate-400 text-[11px]">
            <i class="fa-regular fa-envelope text-blue-500"></i>
            <span>${s.email}</span>
          </div>
        </td>
        <td class="p-3 whitespace-nowrap">
          ${s.sourceUrl ? `
            <a href="${s.sourceUrl}" target="_blank" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] inline-flex items-center gap-1 transition">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Visit Profile
            </a>
          ` : '<span class="text-slate-300">-</span>'}
        </td>
        <td class="p-3 text-center whitespace-nowrap space-x-1">
          <button onclick="openAuditModal('${s.id}')" class="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition" title="Inspect GSTIN, address & payment safety">
            <i class="fa-solid fa-shield-halved text-emerald-600"></i> Audit
          </button>
          <button onclick="quickSingleWhatsApp('${s.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition">
            <i class="fa-brands fa-whatsapp"></i> Chat RFQ
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectAllCheckbox(filtered);
}

function toggleSelectSupplier(id) {
  if (selectedSupplierIds.has(id)) {
    selectedSupplierIds.delete(id);
  } else {
    selectedSupplierIds.add(id);
  }
  renderSearchResultsTable();
  updateSelectedBar();
}

function toggleSelectAllResults() {
  const filtered = getFilteredResults();
  const cb = document.getElementById('selectAllCheckbox');

  if (cb?.checked) {
    filtered.forEach(s => selectedSupplierIds.add(s.id));
  } else {
    filtered.forEach(s => selectedSupplierIds.delete(s.id));
  }

  renderSearchResultsTable();
  updateSelectedBar();
}

function updateSelectAllCheckbox(filtered) {
  const cb = document.getElementById('selectAllCheckbox');
  if (!cb || filtered.length === 0) return;
  cb.checked = filtered.every(s => selectedSupplierIds.has(s.id));
}

function updateSelectedBar() {
  const count = selectedSupplierIds.size;
  document.getElementById('barSelectedCount').innerText = `${count} Suppliers Selected`;
}

// ----------------- BROADCAST ACTIONS -----------------
function getBroadcastPayload() {
  const query = document.getElementById('mainSearchInput')?.value.trim() || 'Rosemount 3051';
  const targetPrice = document.getElementById('rfqTargetPrice')?.value.trim();
  const quantity = document.getElementById('rfqQuantity')?.value.trim() || '1 No';
  const specs = document.getElementById('rfqSpecs')?.value.trim() || 'Standard Factory Calibration';
  const videoUrl = document.getElementById('rfqVideoUrl')?.value.trim();

  if (selectedSupplierIds.size === 0) {
    showToast('Please select at least 1 supplier to send RFQ!', 'warning');
    return null;
  }

  return {
    dealerIds: Array.from(selectedSupplierIds),
    product: {
      name: query,
      model: query,
      brand: query.split(' ')[0] || '',
      quantity: quantity,
      catalogueUrl: '',
      videoUrl: videoUrl,
      specifications: specs
    },
    targetPrice: targetPrice,
    companySenderName: 'Instrument Reselling & Procurement'
  };
}

async function triggerWhatsAppBroadcast() {
  const payload = getBroadcastPayload();
  if (!payload) return;

  try {
    const res = await fetch('/api/broadcast/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      openBroadcastDrawer(data);
    }
  } catch (err) {
    showToast('Error preparing WhatsApp broadcast: ' + err.message, 'error');
  }
}

function openBroadcastDrawer(data) {
  const modal = document.getElementById('broadcastDrawerModal');
  const previewBox = document.getElementById('previewMessageText');
  const listContainer = document.getElementById('whatsappDealerList');

  previewBox.innerText = data.generalMessage;

  listContainer.innerHTML = data.broadcastList.map((item, index) => `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-100 transition" id="waRow_${item.dealerId}">
      <div>
        <div class="font-bold text-slate-800 text-xs">${index + 1}. ${item.companyName}</div>
        <div class="text-[11px] text-slate-500 flex items-center gap-2">
          <span><i class="fa-regular fa-user"></i> ${item.contactPerson}</span>
          <span><i class="fa-brands fa-whatsapp text-emerald-600"></i> +${item.whatsapp}</span>
        </div>
      </div>
      <div>
        <a href="${item.whatsappLink}" target="_blank" onclick="markSent('${item.dealerId}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
          <i class="fa-brands fa-whatsapp"></i> Send via WhatsApp
        </a>
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function markSent(dealerId) {
  const row = document.getElementById(`waRow_${dealerId}`);
  if (row) {
    row.classList.remove('bg-slate-50');
    row.classList.add('bg-emerald-50', 'border-emerald-300');
    const btn = row.querySelector('a');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Sent`;
      btn.classList.replace('bg-emerald-600', 'bg-slate-600');
    }
  }
}

function closeBroadcastDrawer() {
  document.getElementById('broadcastDrawerModal').classList.add('hidden');
}

async function quickSingleWhatsApp(dealerId) {
  const query = document.getElementById('mainSearchInput')?.value.trim() || 'Rosemount 3051';
  const targetPrice = document.getElementById('rfqTargetPrice')?.value.trim();
  const videoUrl = document.getElementById('rfqVideoUrl')?.value.trim();

  const payload = {
    dealerIds: [dealerId],
    product: { name: query, model: query, videoUrl },
    targetPrice,
    companySenderName: 'Procurement Team'
  };

  try {
    const res = await fetch('/api/broadcast/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.broadcastList[0]?.whatsappLink) {
      window.open(data.broadcastList[0].whatsappLink, '_blank');
      showToast('Opening WhatsApp with pre-filled RFQ...', 'success');
    }
  } catch (e) {
    showToast('Error opening WhatsApp', 'error');
  }
}

async function triggerEmailBroadcast() {
  const payload = getBroadcastPayload();
  if (!payload) return;

  try {
    const res = await fetch('/api/broadcast/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.gmailWebUrl) {
      window.open(data.gmailWebUrl, '_blank');
      showToast(`Opening Gmail with ${data.bccEmails.length} suppliers in BCC!`, 'success');
    }
  } catch (err) {
    showToast('Email error: ' + err.message, 'error');
  }
}

// ----------------- BULK EXCEL / CSV IMPORT -----------------
function openImportModal() {
  document.getElementById('importModal').classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('importModal').classList.add('hidden');
  document.getElementById('bulkPasteTextarea').value = '';
}

function handleCsvFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('bulkPasteTextarea').value = e.target.result;
    showToast(`Loaded file: ${file.name}`, 'info');
  };
  reader.readAsText(file);
}

async function submitBulkDealers() {
  const text = document.getElementById('bulkPasteTextarea').value.trim();
  if (!text) {
    showToast('Please paste or select CSV data first!', 'warning');
    return;
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const parsedDealers = [];

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(p => p.trim());
    if (parts.length >= 2) {
      parsedDealers.push({
        companyName: parts[0] || 'Industrial Supplier',
        phone: parts[1] || '',
        city: parts[2] || 'India',
        gstin: parts[3] || '',
        categories: parts[4] || 'Process Instruments'
      });
    }
  }

  if (parsedDealers.length === 0) {
    showToast('No valid dealer lines found. Check the format.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/dealers/import-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealers: parsedDealers })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Imported ${data.count} new suppliers! Total directory: ${data.total}`, 'success');
      closeImportModal();
      handleMainSearch();
    } else {
      showToast('Import failed: ' + data.message, 'error');
    }
  } catch (err) {
    showToast('Import error: ' + err.message, 'error');
  }
}

// ----------------- QUOTES MODAL -----------------
async function openQuotesModal() {
  document.getElementById('quotesModal').classList.remove('hidden');
  await fetchQuotes();
}

function closeQuotesModal() {
  document.getElementById('quotesModal').classList.add('hidden');
}

async function fetchQuotes() {
  try {
    const res = await fetch('/api/quotes');
    const data = await res.json();
    if (data.success) {
      allQuotes = data.data || [];
      if (document.getElementById('topQuotesCount')) {
        document.getElementById('topQuotesCount').innerText = allQuotes.length;
      }
      renderQuotesList(allQuotes);
    }
  } catch (e) {
    console.error(e);
  }
}

function renderQuotesList(quotes) {
  const container = document.getElementById('receivedQuotesList');
  if (!container) return;

  if (quotes.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">No quotes received yet.</div>`;
    return;
  }

  const prices = quotes.map(q => q.quotedPrice).filter(p => p > 0);
  const lowest = prices.length > 0 ? Math.min(...prices) : 0;

  container.innerHTML = quotes.map(q => `
    <div class="p-3.5 rounded-xl border ${q.quotedPrice === lowest ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-white border-slate-200'} text-xs space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-bold text-slate-900">${q.dealerName}</span>
          ${q.quotedPrice === lowest ? `<span class="ml-2 px-2 py-0.5 bg-emerald-600 text-white rounded-full font-bold text-[9px]">LOWEST BID</span>` : ''}
          <div class="text-slate-400 text-[11px]">${q.model} • ${q.contactPerson} (${q.phone})</div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-emerald-700 font-mono">₹${Number(q.quotedPrice).toLocaleString('en-IN')}</div>
          <span class="text-[10px] text-slate-500">${q.stockStatus}</span>
        </div>
      </div>
      <div class="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
        <b>Delivery:</b> ${q.deliveryTime} • <b>Warranty:</b> ${q.warranty} • <b>Payment:</b> ${q.paymentTerms}
      </div>
    </div>
  `).join('');
}

// ----------------- GST CHECK -----------------
function openGstModal() {
  document.getElementById('gstModal').classList.remove('hidden');
  document.getElementById('gstinInput').focus();
}

function closeGstModal() {
  document.getElementById('gstModal').classList.add('hidden');
}

function verifySpecificGstin(gstin) {
  if (!gstin) return;
  openGstModal();
  document.getElementById('gstinInput').value = gstin;
  runGstVerification();
}

async function runGstVerification() {
  const gstin = document.getElementById('gstinInput')?.value.trim();
  const box = document.getElementById('gstResultBox');
  if (!gstin) return;

  box.classList.remove('hidden');
  box.innerHTML = `<span class="text-slate-500">Checking GSTIN...</span>`;

  try {
    const res = await fetch('/api/verify-gst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gstin })
    });
    const data = await res.json();
    if (data.success) {
      box.className = 'rounded-xl p-3 border bg-emerald-50 border-emerald-200 text-emerald-950 text-xs space-y-1';
      box.innerHTML = `
        <div class="font-bold text-emerald-800"><i class="fa-solid fa-circle-check"></i> ${data.message}</div>
        <div>State: <b>${data.stateName}</b> | PAN: <b>${data.pan}</b></div>
        <div>Score: <b>${data.trustScore}</b></div>
      `;
    } else {
      box.className = 'rounded-xl p-3 border bg-red-50 border-red-200 text-red-950 text-xs';
      box.innerHTML = `<div class="font-bold text-red-700">${data.message}</div>`;
    }
  } catch (err) {
    box.innerHTML = `<span class="text-red-500">${err.message}</span>`;
  }
}

// ----------------- TOAST -----------------
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const bgColors = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    error: 'bg-red-600'
  };

  toast.className = `fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white transition-all ${bgColors[type] || 'bg-slate-800'}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info mr-1.5"></i> ${message}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// ----------------- DUE DILIGENCE & AUDIT MODAL -----------------
async function openAuditModal(dealerId) {
  const modal = document.getElementById('auditModal');
  const container = document.getElementById('auditModalContent');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  container.innerHTML = `
    <div class="text-center py-8 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600 block mb-2"></i>
      Running due diligence check on official Government GST & vendor records...
    </div>
  `;

  try {
    const res = await fetch(`/api/dealers/audit/${dealerId}`);
    const result = await res.json();
    if (!result.success || !result.data) {
      container.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-bold">${result.message || 'Audit report could not be loaded.'}</div>`;
      return;
    }

    const d = result.data;
    const gstin = d.gstin || '';
    const hasValidGstin = gstin.length === 15 && !gstin.includes('Online');

    container.innerHTML = `
      <!-- Company Identity & Verification Card -->
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl space-y-2">
        <div class="flex items-start justify-between">
          <div>
            <div class="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Legal Verified Entity</div>
            <h4 class="text-base font-bold">${d.legalName || d.companyName}</h4>
            <div class="text-xs text-slate-300 font-mono mt-0.5">Trade Name: ${d.tradeName || d.companyName}</div>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 inline-block shadow">
              <i class="fa-solid fa-shield-check"></i> ${d.trustScore || 'Verified'}
            </span>
            <div class="text-[10px] text-slate-300 mt-1 font-semibold">${d.riskLevel || 'LOW RISK'}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
          <div>
            <span class="text-slate-400 block text-[10px]">Entity Type</span>
            <span class="font-semibold text-slate-200">${d.entityType || 'Registered Business'}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">State Jurisdiction</span>
            <span class="font-semibold text-slate-200">${d.state || 'India'}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Industrial Hub</span>
            <span class="font-semibold text-slate-200">${d.city || 'India'}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">PAN Number</span>
            <span class="font-mono font-bold text-amber-300">${d.pan || 'PAN On File'}</span>
          </div>
        </div>
      </div>

      <!-- Government Portal & Map Deep Links -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Official GST Portal -->
        <div class="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-landmark text-emerald-700"></i> Official GSTIN Verification
            </span>
            <span class="font-mono font-bold text-xs text-emerald-800">${gstin}</span>
          </div>
          <p class="text-[11px] text-emerald-700">
            Verify active status, return filing history (GSTR-1 & 3B), and legal address directly on the Central Govt portal.
          </p>
          ${hasValidGstin ? `
            <a href="https://services.gst.gov.in/services/searchtp?gstin=${gstin}" target="_blank" class="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 transition shadow-sm">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in services.gst.gov.in
            </a>
          ` : `
            <div class="text-[10px] text-slate-500 italic">Online directory verified profile</div>
          `}
        </div>

        <!-- Google Maps Location -->
        <div class="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-blue-900 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-location-dot text-blue-600"></i> Physical Industrial Location
            </span>
            <span class="text-xs font-semibold text-blue-800">${d.city}, ${d.state}</span>
          </div>
          <p class="text-[11px] text-blue-700">
            Inspect physical factory/office address, industrial estate location, and street presence.
          </p>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.companyName + ' ' + d.city)}" target="_blank" class="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 transition shadow-sm">
            <i class="fa-solid fa-map-location-dot"></i> Check Factory on Google Maps
          </a>
        </div>
      </div>

      <!-- Anti-Fraud Safe Payment Protocol (Strict Industrial Reselling Guidelines) -->
      <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
        <div class="flex items-center gap-2 text-amber-900 font-bold text-xs">
          <i class="fa-solid fa-triangle-exclamation text-amber-600 text-sm"></i>
          <span>Anti-Fraud Payment Protocol (Reseller Protection Guidelines)</span>
        </div>
        <ul class="text-[11px] text-amber-950 space-y-1.5 list-disc pl-4">
          <li>
            <b>Bank Account Name Rule:</b> Transfer money ONLY to a <b>Current Account</b> in the name of <u>"${d.legalName || d.companyName}"</u>. NEVER make payments to personal savings accounts, Google Pay, or personal UPI numbers.
          </li>
          <li>
            <b>Calibration & Serial Traceability:</b> Demand OEM original test/calibration certificates with matching serial number plates before taking physical delivery.
          </li>
          <li>
            <b>Dispatch Video Proof:</b> Always ask the supplier to send a WhatsApp video showing the packaged instrument, model nameplate, and calibration seal before releasing full payment.
          </li>
        </ul>
      </div>

      <!-- Direct Contact Bar -->
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs">
          <div class="font-bold text-slate-800">Direct Contact: +${d.whatsapp || d.phone}</div>
          <div class="text-[11px] text-slate-500">${d.email}</div>
        </div>
        <div class="flex gap-2">
          ${d.sourceUrl ? `
            <a href="${d.sourceUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs inline-flex items-center gap-1">
              <i class="fa-solid fa-globe"></i> Website
            </a>
          ` : ''}
          <button onclick="quickSingleWhatsApp('${d.dealerId}'); closeAuditModal();" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition">
            <i class="fa-brands fa-whatsapp"></i> Chat RFQ Now
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-xl text-xs">Audit error: ${err.message}</div>`;
  }
}

function closeAuditModal() {
  const modal = document.getElementById('auditModal');
  if (modal) modal.classList.add('hidden');
}

// ----------------- EXTERNAL PORTALS DEEP VERIFICATION -----------------
function openLiveIndiaMartDirect() {
  const q = document.getElementById('mainSearchInput')?.value.trim() || 'pH meter';
  const url = `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q)}`;
  window.open(url, '_blank');
  showToast(`Opening live IndiaMART search for "${q}"...`, 'info');
}

function openLiveTradeIndiaDirect() {
  const q = document.getElementById('mainSearchInput')?.value.trim() || 'pH meter';
  const url = `https://www.tradeindia.com/search.html?keyword=${encodeURIComponent(q)}`;
  window.open(url, '_blank');
  showToast(`Opening live TradeIndia search for "${q}"...`, 'info');
}

function openLiveGoogleDirect() {
  const q = document.getElementById('mainSearchInput')?.value.trim() || 'pH meter';
  const url = `https://www.google.com/search?q=${encodeURIComponent(q + ' dealers suppliers stockists India contact')}`;
  window.open(url, '_blank');
  showToast(`Opening Google India suppliers search for "${q}"...`, 'info');
}

// ----------------- LIVE WEB CRAWLER DISCOVERY -----------------
async function triggerLiveWebCrawl() {
  const q = document.getElementById('mainSearchInput')?.value.trim() || 'pH meter';
  const btn = document.getElementById('crawlWebBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Crawling...`;
  }

  showToast(`Crawling web for new live suppliers of "${q}"...`, 'info');

  try {
    const res = await fetch('/api/dealers/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, city: 'India' })
    });
    const data = await res.json();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> +Crawl Internet (Live)`;
    }

    if (data.success && data.dealers && data.dealers.length > 0) {
      let addedCount = 0;
      data.dealers.forEach(nd => {
        if (!currentSearchResults.some(existing => existing.id === nd.id || existing.companyName.toLowerCase() === nd.companyName.toLowerCase())) {
          currentSearchResults.push(nd);
          selectedSupplierIds.add(nd.id);
          addedCount++;
        }
      });

      renderSearchResultsTable();
      updateCounts({});
      updateSelectedBar();

      showToast(`Added ${addedCount} newly discovered live web suppliers!`, 'success');
    } else {
      showToast('No new suppliers found from crawler. All top suppliers are already listed.', 'info');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> +Crawl Internet (Live)`;
    }
    showToast('Web crawler error: ' + err.message, 'error');
  }
}

// ----------------- RESELLER MARGIN & CLIENT QUOTATION -----------------
function openMarginModal() {
  const modal = document.getElementById('marginModal');
  if (!modal) return;
  
  const query = document.getElementById('mainSearchInput')?.value.trim() || 'Process Instrument';
  const targetPrice = Number(document.getElementById('rfqTargetPrice')?.value) || 25000;
  const qty = document.getElementById('rfqQuantity')?.value.trim() || '1 No';
  const specs = document.getElementById('rfqSpecs')?.value.trim() || 'Standard Specification';

  document.getElementById('quoteModalItem').value = query;
  document.getElementById('quoteModalBuyPrice').value = targetPrice;
  document.getElementById('quoteModalQty').value = qty;
  document.getElementById('quoteModalSpecs').value = specs;

  calculateMargin();
  modal.classList.remove('hidden');
}

function closeMarginModal() {
  document.getElementById('marginModal')?.classList.add('hidden');
}

function calculateMargin() {
  const buyPrice = Number(document.getElementById('quoteModalBuyPrice')?.value) || 0;
  const marginPct = Number(document.getElementById('quoteModalMarginPct')?.value) || 15;
  const qtyStr = document.getElementById('quoteModalQty')?.value || '1';
  const qtyNum = parseFloat(qtyStr) || 1;

  const profitPerUnit = (buyPrice * marginPct) / 100;
  const sellPricePerUnit = buyPrice + profitPerUnit;
  const totalBasePrice = sellPricePerUnit * qtyNum;
  const gst18 = totalBasePrice * 0.18;
  const grandTotal = totalBasePrice + gst18;

  document.getElementById('calcProfitPerUnit').innerText = '₹' + Math.round(profitPerUnit).toLocaleString('en-IN');
  document.getElementById('calcSellPricePerUnit').innerText = '₹' + Math.round(sellPricePerUnit).toLocaleString('en-IN');
  document.getElementById('calcBaseTotal').innerText = '₹' + Math.round(totalBasePrice).toLocaleString('en-IN');
  document.getElementById('calcGstTotal').innerText = '₹' + Math.round(gst18).toLocaleString('en-IN');
  document.getElementById('calcGrandTotal').innerText = '₹' + Math.round(grandTotal).toLocaleString('en-IN');
}

function printClientQuotation() {
  const clientName = document.getElementById('quoteModalClientName')?.value.trim() || 'Valued Industrial Customer';
  const item = document.getElementById('quoteModalItem')?.value || 'Industrial Instrument';
  const specs = document.getElementById('quoteModalSpecs')?.value || 'Standard Specification';
  const qty = document.getElementById('quoteModalQty')?.value || '1 No';
  const sellPrice = document.getElementById('calcSellPricePerUnit')?.innerText || '₹0';
  const baseTotal = document.getElementById('calcBaseTotal')?.innerText || '₹0';
  const gst = document.getElementById('calcGstTotal')?.innerText || '₹0';
  const grandTotal = document.getElementById('calcGrandTotal')?.innerText || '₹0';
  const quoteNo = 'QT-' + Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation - ${quoteNo}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
        .title { font-size: 22px; font-weight: 800; color: #1e3a8a; }
        .subtitle { font-size: 12px; color: #64748b; }
        .meta { margin-top: 25px; display: flex; justify-content: space-between; font-size: 13px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; width: 45%; }
        table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px; }
        th { background: #1e293b; color: white; padding: 10px; text-align: left; }
        td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
        .totals { margin-top: 20px; float: right; width: 320px; font-size: 13px; }
        .totals tr td { padding: 6px 0; border: none; }
        .grand-total { font-size: 16px; font-weight: 800; color: #047857; border-top: 2px solid #e2e8f0; padding-top: 8px; }
        .terms { margin-top: 150px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .btn-print { background: #2563eb; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
        @media print { .no-print { display: none; } body { margin: 15px; } }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>
      <div class="header">
        <div>
          <div class="title">INDUSTRIAL INSTRUMENTS & AUTOMATION RESELLER</div>
          <div class="subtitle">Authorised Dealer & Stockist of Process Instrumentation</div>
          <div class="subtitle">Guindy Industrial Estate, Chennai / Mumbai | sales@instrumenthub.in</div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #2563eb; font-size: 20px;">COMMERCIAL QUOTATION</h2>
          <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">Ref: ${quoteNo}</div>
          <div style="font-size: 12px; color: #64748b;">Date: ${today}</div>
        </div>
      </div>

      <div class="meta">
        <div class="box">
          <b>Quotation To (Buyer):</b><br>
          <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${clientName}</span><br>
          <span>Purchase / Instrumentation Department</span><br>
          <span>Project Procurement Division</span>
        </div>
        <div class="box">
          <b>Commercial Terms:</b><br>
          <span>Price Basis: Ex-Works / Delivered</span><br>
          <span>Taxation: GST 18% Extra as Applicable</span><br>
          <span>Payment: 30 Days Credit / Against PI</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">S.No</th>
            <th>Item Description & Detailed Specifications</th>
            <th style="width: 80px; text-align: center;">Qty</th>
            <th style="width: 120px; text-align: right;">Unit Price (₹)</th>
            <th style="width: 130px; text-align: right;">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <b>${item}</b><br>
              <span style="font-size: 12px; color: #475569;">${specs}</span><br>
              <span style="font-size: 11px; color: #059669; font-weight: bold;">✓ Supplied with original OEM NABL Calibration Certificate & Warranty</span>
            </td>
            <td style="text-align: center; font-weight: bold;">${qty}</td>
            <td style="text-align: right; font-weight: bold;">${sellPrice}</td>
            <td style="text-align: right; font-weight: bold;">${baseTotal}</td>
          </tr>
        </tbody>
      </table>

      <table class="totals">
        <tr>
          <td>Sub Total (Ex-Tax):</td>
          <td style="text-align: right; font-weight: bold;">${baseTotal}</td>
        </tr>
        <tr>
          <td>IGST / CGST+SGST (18%):</td>
          <td style="text-align: right; font-weight: bold;">${gst}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total (Incl. GST):</td>
          <td style="text-align: right;">${grandTotal}</td>
        </tr>
      </table>

      <div class="terms">
        <b>Standard Commercial Terms & Conditions:</b><br>
        1. <b>Delivery Period:</b> 1 to 2 Weeks from the date of confirmed Purchase Order.<br>
        2. <b>Warranty:</b> 12 Months from dispatch date against manufacturing defects.<br>
        3. <b>Validity:</b> This quotation is valid for 15 days.<br>
        4. <b>Certificates:</b> NABL Traceable Calibration Certificate will be provided along with material dispatch.
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ----------------- EXPORT QUOTES TO CSV -----------------
function exportQuotesToCsv() {
  if (!allQuotes || allQuotes.length === 0) {
    showToast('No quotes received to export!', 'warning');
    return;
  }

  const headers = ['Quotation ID', 'Supplier Name', 'Contact Person', 'Phone', 'Email', 'Instrument Model', 'Quoted Price (INR)', 'Stock Status', 'Delivery Lead Time', 'Warranty', 'Payment Terms', 'Received At'];
  const rows = allQuotes.map(q => [
    q.id || '',
    `"${(q.dealerName || '').replace(/"/g, '""')}"`,
    `"${(q.contactPerson || '').replace(/"/g, '""')}"`,
    q.phone || '',
    q.email || '',
    `"${(q.model || '').replace(/"/g, '""')}"`,
    q.quotedPrice || '',
    `"${(q.stockStatus || '').replace(/"/g, '""')}"`,
    `"${(q.deliveryTime || '').replace(/"/g, '""')}"`,
    `"${(q.warranty || '').replace(/"/g, '""')}"`,
    `"${(q.paymentTerms || '').replace(/"/g, '""')}"`,
    q.submittedAt || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Dealer_Quotes_Comparison_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Quotes comparison exported to CSV successfully!', 'success');
}
