import { getActiveTrip } from '../core/state.js';
import { t } from '../utils/helpers.js';
import { showInteractiveToast } from '../utils/ui-feedback.js';
import { saveTripToCloud } from '../core/storage.js';
import { refreshActiveTripUI } from './trip-manager.js';

export function addMember() {
    const currentTrip = getActiveTrip();
    const name = document.getElementById('memberNameInput').value.trim();
    const phone = document.getElementById('memberPhoneInput').value.trim();
    if (!name) return alert(t('الرجاء إدخال الاسم', 'Please enter a name'));
    if (!currentTrip.members) currentTrip.members = [];
    if (currentTrip.members.some(m => m.name === name)) return alert(t('الاسم مسجل مسبقاً', 'Name exists'));

    currentTrip.members.push({ name: name, phone: phone });
    document.getElementById('memberNameInput').value = ''; document.getElementById('memberPhoneInput').value = '';
    saveTripToCloud(currentTrip);
}

export function editMemberName(oldName) {
    const trip = getActiveTrip();
    if (!trip) return;
    const newName = prompt(t('أدخل الاسم الجديد للعضو:', 'Enter new name for member:'), oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        const cleaned = newName.trim();
        if (trip.members.some(m => m.name === cleaned)) {
            return alert(t('هذا الاسم موجود مسبقاً!', 'This name already exists!'));
        }
        const member = trip.members.find(m => m.name === oldName);
        if (member) {
            member.name = cleaned;
            if (trip.expenses) {
                trip.expenses.forEach(e => {
                    if (e.paidBy === oldName) e.paidBy = cleaned;
                    if (e.shares && e.shares[oldName] !== undefined) {
                        e.shares[cleaned] = e.shares[oldName];
                        delete e.shares[oldName];
                    }
                    if (e.invoiceItems) {
                        e.invoiceItems.forEach(item => {
                            if (item.members) {
                                item.members = item.members.map(m => m === oldName ? cleaned : m);
                            }
                        });
                    }
                });
            }
            saveTripToCloud(trip);
            refreshActiveTripUI();
            showInteractiveToast(t(`تم تعديل الاسم من "${oldName}" إلى "${cleaned}"`, `Name changed from "${oldName}" to "${cleaned}"`), 'edit');
        }
    }
}

export function updateMembersListUI(trip) {
    const container = document.getElementById('membersList');
    if (!container) return;
    container.innerHTML = '';
    trip.members.forEach(member => {
        const div = document.createElement('div');
        div.className = "bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg flex justify-between items-center border border-gray-100 dark:border-gray-600";
        div.innerHTML = `
          <div class="flex flex-col flex-1 truncate">
            <span class="truncate font-bold text-sm">👤 ${member.name}</span>
            <span class="text-gray-400 font-mono text-[10px] mt-0.5">${member.phone || t('بدون هاتف', 'No phone')}</span>
          </div>
          <div class="flex items-center gap-1.5 ms-2">
            <button onclick="editMemberName('${member.name}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/40 p-1.5 rounded-lg transition" title="${t('تعديل الاسم', 'Edit Name')}">✏️</button>
          </div>
        `;
        container.appendChild(div);
    });
}

export function updateExpensePayerDropdown(trip) {
    const select = document.getElementById('expensePayer');
    if (!select) return;
    select.innerHTML = `<option value="">${t('اختيار شخص...', 'Select Person...')}</option>`;
    trip.members.forEach(m => {
        const opt = document.createElement('option'); opt.value = m.name; opt.textContent = m.name; select.appendChild(opt);
    });
}