import { state, getActiveTrip } from '../core/state.js';
import { t, getLocalIsoString, formatToDateTimeLocalString, formatDateString } from '../utils/helpers.js';
import { saveTripToCloud } from '../core/storage.js';
import { updateCategoryDropdown } from './categories.js';

export function openExpenseModal(expenseId = null) {
    const trip = getActiveTrip();
    if (!trip || trip.members.length === 0) {
        return alert(t('الرجاء إضافة فرد واحد على الأقل قبل تسجيل المصروفات.', 'Please add at least one member before logging expenses.'));
    }
    updateCategoryDropdown(trip);
    
    const title = document.getElementById('expenseCardTitle');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    const submitBtn = document.getElementById('submitExpenseBtn');

    if (expenseId !== null && typeof expenseId === 'string') {
        const e = trip.expenses.find(x => x.id === expenseId);
        if (e) {
            state.editingExpenseId = expenseId;
            if (title) title.innerHTML = t('<span>✏️</span> تعديل المصروف', '<span>✏️</span> Edit Expense');
            if (submitBtn) submitBtn.innerHTML = t('✔️ حفظ التعديل', '✔️ Update');
            if (deleteBtn) deleteBtn.classList.remove('hidden');

            document.getElementById('expensePayer').value = e.paidBy;
            document.getElementById('expenseDesc').value = e.description || '';
            let savedDate = e.rawDate || e.dateTime || e.date || e.timestamp || e.createdAt;
            document.getElementById('expenseDateTime').value = formatToDateTimeLocalString(savedDate);
            document.getElementById('expenseCategory').value = e.category || '';

            if (e.isInvoice) {
                switchExpenseMode('invoice'); 
                state.tempInvoiceItems = e.invoiceItems ? JSON.parse(JSON.stringify(e.invoiceItems)) : [];
                document.getElementById('invoiceDiscountPercent').value = e.discountPercent || 0;
                document.getElementById('invoiceServicePercent').value = e.servicePercent || 0;
                document.getElementById('invoiceVatPercent').value = e.vatPercent || 0;
                renderTemporaryInvoiceItemsListUI(); 
                updateInvoiceLiveSummary();
            } else {
                switchExpenseMode('simple'); 
                document.getElementById('expenseAmount').value = e.amount;
                renderShareInputs(trip);
                trip.members.forEach(m => {
                    const cb = document.getElementById(`check_${m.name}`); 
                    const inp = document.getElementById(`share_${m.name}`);
                    const val = e.shares ? (e.shares[m.name] || 0) : 0;
                    if (cb && inp) { cb.checked = val > 0; inp.value = val > 0 ? val.toFixed(2) : ''; }
                });
            }
            document.getElementById('expenseModal').classList.remove('hidden'); 
            document.body.style.overflow = 'hidden';
            return;
        }
    }

    state.editingExpenseId = null;
    if (deleteBtn) deleteBtn.classList.add('hidden');
    resetExpenseForm(trip);
    document.getElementById('expenseModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeExpenseModal() {
    document.getElementById('expenseModal').classList.add('hidden');
    document.body.style.overflow = '';
    state.editingExpenseId = null;
}

export function switchExpenseMode(mode) {
    state.currentExpenseMode = mode;
    const tSimp = document.getElementById('tabSimple'); const tInv = document.getElementById('tabInvoice');
    const wSimp = document.getElementById('simpleExpenseWrapper'); const wInv = document.getElementById('invoiceExpenseWrapper');
    if (mode === 'simple') {
        tSimp.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm transition";
        tInv.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition";
        wSimp.classList.remove('hidden'); wInv.classList.add('hidden');
    } else {
        tInv.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm transition";
        tSimp.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition";
        wInv.classList.remove('hidden'); wSimp.classList.add('hidden');
        renderInvoiceItemMembersCheckboxes(getActiveTrip());
        updateInvoiceLiveSummary();
    }
}

export function addInvoiceItemToArray() {
    const name = document.getElementById('invoiceItemName').value.trim();
    const price = parseFloat(document.getElementById('invoiceItemPrice').value);
    if (!name || isNaN(price) || price <= 0) return alert(t('بيانات البند غير صحيحة', 'Invalid item data'));
    const members = Array.from(document.querySelectorAll('input[name="invoiceMemberItemCheckbox"]:checked')).map(cb => cb.value);
    if (members.length === 0) return alert(t('حدد مشتركاً', 'Select members'));

    state.tempInvoiceItems.push({ id: 'i_' + Date.now(), name, price, members });
    document.getElementById('invoiceItemName').value = ''; document.getElementById('invoiceItemPrice').value = '';
    renderTemporaryInvoiceItemsListUI(); updateInvoiceLiveSummary();
}

export function removeInvoiceItemFromArray(id) {
    state.tempInvoiceItems = state.tempInvoiceItems.filter(i => i.id !== id);
    renderTemporaryInvoiceItemsListUI(); updateInvoiceLiveSummary();
}

export function renderTemporaryInvoiceItemsListUI() {
    const container = document.getElementById('temporaryInvoiceItemsList');
    if (!container) return;
    container.innerHTML = '';
    state.tempInvoiceItems.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700 shadow-sm";
        div.innerHTML = `
            <div class="truncate flex-1"><strong class="text-gray-800 dark:text-gray-200 text-xs">${item.name}</strong><span class="text-[9px] text-gray-400 block">${item.members.join('، ')}</span></div>
            <div class="flex items-center gap-2"><span class="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">${item.price.toFixed(2)}</span><button onclick="removeInvoiceItemFromArray('${item.id}')" class="text-rose-500">❌</button></div>
        `;
        container.appendChild(div);
    });
}

export function updateInvoiceLiveSummary() {
    let subtotal = state.tempInvoiceItems.reduce((s, i) => s + i.price, 0);
    let d = parseFloat(document.getElementById('invoiceDiscountPercent').value) || 0;
    let s = parseFloat(document.getElementById('invoiceServicePercent').value) || 0;
    let v = parseFloat(document.getElementById('invoiceVatPercent').value) || 0;

    let dCost = subtotal * (d / 100);
    let aftD = subtotal - dCost;
    let sCost = aftD * (s / 100);
    let vCost = (aftD + sCost) * (v / 100);

    document.getElementById('lblInvoiceSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('lblInvoiceDiscountCost').textContent = `-${dCost.toFixed(2)}`;
    document.getElementById('lblInvoiceTaxesCost').textContent = `+${(sCost + vCost).toFixed(2)}`;
    document.getElementById('lblInvoiceGrandTotal').textContent = (aftD + sCost + vCost).toFixed(2);
}

export function distributeEqually() {
    const tVal = parseFloat(document.getElementById('expenseAmount').value);
    if (isNaN(tVal) || tVal <= 0) return;
    const trip = getActiveTrip();
    const checked = trip.members.filter(m => document.getElementById(`check_${m.name}`).checked);
    if (checked.length === 0) return;
    const eq = tVal / checked.length;
    trip.members.forEach(m => {
        const cb = document.getElementById(`check_${m.name}`);
        const inp = document.getElementById(`share_${m.name}`);
        if (inp) inp.value = (cb && cb.checked) ? eq.toFixed(2) : '';
    });
}

export function addExpense() {
    const trip = getActiveTrip();
    const payer = document.getElementById('expensePayer').value;
    const desc = document.getElementById('expenseDesc').value.trim();
    const cat = document.getElementById('expenseCategory').value;

    let rawDate = document.getElementById('expenseDateTime').value;
    if (!rawDate && state.editingExpenseId !== null) {
        const oldExp = trip.expenses.find(x => x.id === state.editingExpenseId);
        let savedDate = oldExp ? (oldExp.rawDate || oldExp.dateTime || oldExp.date || oldExp.timestamp) : null;
        rawDate = formatToDateTimeLocalString(savedDate);
    } else if (!rawDate) {
        rawDate = getLocalIsoString();
    }

    if (!payer || !desc) return alert(t('أكمل البيانات الأساسية', 'Fill required fields'));

    let fAmount = 0; let eShares = {}; let isInv = (state.currentExpenseMode === 'invoice');

    if (!isInv) {
        fAmount = parseFloat(document.getElementById('expenseAmount').value);
        if (isNaN(fAmount) || fAmount <= 0) return alert(t('أدخل مبلغ صحيح', 'Invalid amount'));
        let sum = 0;
        trip.members.forEach(m => {
            const cb = document.getElementById(`check_${m.name}`);
            const inp = document.getElementById(`share_${m.name}`);
            let val = (cb && cb.checked) ? (parseFloat(inp.value) || 0) : 0;
            eShares[m.name] = val; sum += val;
        });
        if (Math.abs(sum - fAmount) > 0.5) return alert(t('مجموع التوزيع لا يساوي الإجمالي', 'Sum mismatch'));
    } else {
        if (state.tempInvoiceItems.length === 0) return;
        let sub = state.tempInvoiceItems.reduce((s, i) => s + i.price, 0);
        let d = parseFloat(document.getElementById('invoiceDiscountPercent').value) || 0;
        let s = parseFloat(document.getElementById('invoiceServicePercent').value) || 0;
        let v = parseFloat(document.getElementById('invoiceVatPercent').value) || 0;
        let dCost = sub * (d / 100); let aft = sub - dCost; let sCost = aft * (s / 100); let vCost = (aft + sCost) * (v / 100);
        fAmount = aft + sCost + vCost;

        let bShares = {}; trip.members.forEach(m => bShares[m.name] = 0);
        state.tempInvoiceItems.forEach(i => { let cpu = i.price / i.members.length; i.members.forEach(m => bShares[m] += cpu); });
        let infl = sub > 0 ? (fAmount / sub) : 1; let calc = 0;
        trip.members.forEach(m => { eShares[m.name] = parseFloat((bShares[m.name] * infl).toFixed(2)); calc += eShares[m.name]; });
        let diff = fAmount - calc;
        if (Math.abs(diff) > 0.01) {
            let first = trip.members.find(m => eShares[m.name] > 0);
            if (first) eShares[first.name] = parseFloat((eShares[first.name] + diff).toFixed(2));
        }
    }

    if (!trip.expenses) trip.expenses = [];
    const expData = {
        id: state.editingExpenseId !== null ? state.editingExpenseId : 'e_' + Date.now(),
        rawDate, paidBy: payer, category: cat || t('عام', 'General'), amount: fAmount, description: desc, shares: eShares,
        isInvoice: isInv, invoiceItems: isInv ? state.tempInvoiceItems : [],
        discountPercent: isInv ? parseFloat(document.getElementById('invoiceDiscountPercent').value) : 0,
        servicePercent: isInv ? parseFloat(document.getElementById('invoiceServicePercent').value) : 0,
        vatPercent: isInv ? parseFloat(document.getElementById('invoiceVatPercent').value) : 0
    };

    if (state.editingExpenseId !== null) {
        const idx = trip.expenses.findIndex(e => e.id === state.editingExpenseId);
        if (idx !== -1) trip.expenses[idx] = expData;
    } else { trip.expenses.push(expData); }

    closeExpenseModal(); saveTripToCloud(trip);
}

export function startEditExpense(id) {
    openExpenseModal(id);
}

export function deleteExpense(id) {
    if (!confirm(t('تأكيد الحذف؟', 'Delete?'))) return;
    const trip = getActiveTrip(); trip.expenses = trip.expenses.filter(x => x.id !== id);
    saveTripToCloud(trip);
}

export function deleteExpenseFromModal() {
    if (!state.editingExpenseId) return;
    deleteExpense(state.editingExpenseId);
    closeExpenseModal();
}

export function resetExpenseForm(trip) {
    const title = document.getElementById('expenseCardTitle');
    const submitBtn = document.getElementById('submitExpenseBtn');
    if (title) title.innerHTML = t('<span>💰</span> تسجيل مصروف', '<span>💰</span> Log Expense');
    if (submitBtn) submitBtn.innerHTML = t('✔️ حفظ البيانات', '✔️ Save');
    
    document.getElementById('expensePayer').value = ''; document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseDateTime').value = getLocalIsoString();
    document.getElementById('expenseCategory').selectedIndex = 0;
    state.tempInvoiceItems = []; document.getElementById('invoiceItemName').value = ''; document.getElementById('invoiceItemPrice').value = '';
    document.getElementById('invoiceDiscountPercent').value = '0'; document.getElementById('invoiceServicePercent').value = '12'; document.getElementById('invoiceVatPercent').value = '14';
    renderTemporaryInvoiceItemsListUI();
    trip.members.forEach(m => {
        const cb = document.getElementById(`check_${m.name}`); const inp = document.getElementById(`share_${m.name}`);
        if (cb) cb.checked = true; if (inp) inp.value = '';
    });
    switchExpenseMode('simple');
}

export function toggleRow(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

export function updateExpensesTable(trip) {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!trip.expenses || trip.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-400 italic">${t('لا يوجد', 'Empty')}</td></tr>`; return;
    }

    const sorted = [...trip.expenses].sort((a, b) => new Date(formatToDateTimeLocalString(b.rawDate || b.dateTime || b.date) || 0) - new Date(formatToDateTimeLocalString(a.rawDate || a.dateTime || a.date) || 0));

    sorted.forEach(e => {
        let sDet = Object.keys(e.shares || {}).filter(n => e.shares[n] > 0).map(n => `${n}(${e.shares[n].toFixed(0)})`).join('، ');
        let dDate = formatDateString(e.rawDate || e.dateTime || e.date);
        let catBadge = `<span class="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap">${e.category || t('عام', 'Gen')}</span>`;
        let typeIco = e.isInvoice ? '🧾 ' : '';

        const trM = document.createElement('tr');
        trM.className = "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition border-b border-gray-100 dark:border-gray-700 last:border-0";
        trM.onclick = () => openExpenseModal(e.id);
        trM.innerHTML = `
          <td class="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">${dDate}</td>
          <td class="px-4 py-3 text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[80px]">${e.paidBy}</td>
          <td class="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[130px]">${typeIco}${e.description}</td>
          <td class="px-4 py-3 text-end font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">${e.amount.toFixed(2)}</td>
        `;
        tbody.appendChild(trM);
    });
}

export function renderShareInputs(trip) {
    const container = document.getElementById('sharesInputList');
    if (!container) return;
    container.innerHTML = '';
    trip.members.forEach(m => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-xs";
        div.innerHTML = `
          <input type="checkbox" id="check_${m.name}" checked class="rounded border-gray-300 w-4 h-4 cursor-pointer">
          <label for="check_${m.name}" class="flex-1 font-bold text-gray-700 dark:text-gray-300 cursor-pointer truncate">${m.name}</label>
          <input type="number" id="share_${m.name}" placeholder="0" class="w-20 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-center font-mono font-bold outline-none focus:border-blue-500">
        `;
        container.appendChild(div);
    });
}

export function renderInvoiceItemMembersCheckboxes(trip) {
    const box = document.getElementById('invoiceItemMembersBox');
    if (!box) return;
    box.innerHTML = '';
    trip.members.forEach(m => {
        const label = document.createElement('label');
        label.className = "flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 transition text-[11px] font-bold text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/50";
        label.innerHTML = `<input type="checkbox" value="${m.name}" name="invoiceMemberItemCheckbox" checked class="w-3.5 h-3.5 rounded text-indigo-600 border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-900"><span>${m.name}</span>`;
        box.appendChild(label);
    });
}