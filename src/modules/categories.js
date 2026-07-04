import { state, getActiveTrip } from '../core/state.js';
import { t } from '../utils/helpers.js';
import { showInteractiveToast } from '../utils/ui-feedback.js';
import { saveTripToCloud } from '../core/storage.js';
import { updateExpensesTable } from './expenses.js';

export function updateCategoriesListUI(trip) {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    container.innerHTML = '';
    let categories = trip.categories;
    if (!categories || categories.length === 0) {
        categories = state.currentLang === 'ar' ? [...state.defaultCategoriesAr] : [...state.defaultCategoriesEn];
        trip.categories = categories;
    }
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = "bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-600";
        div.innerHTML = `
            <span>${cat}</span>
            <button onclick="editCategoryName('${cat}')" class="text-blue-500 hover:text-blue-700" title="${t('تعديل', 'Edit')}">✏️</button>
            <button onclick="deleteCategoryName('${cat}')" class="text-rose-500 hover:text-rose-700" title="${t('حذف', 'Delete')}">🗑️</button>
        `;
        container.appendChild(div);
    });
    updateCategoryDropdown(trip);
}

export function addCategoryFromUI() {
    const trip = getActiveTrip();
    const input = document.getElementById('newCategoryInput');
    const newCat = input.value.trim();
    if (!newCat) return alert(t('الرجاء كتابة اسم البند الجديد', 'Please enter a category name'));
    if (!trip.categories) trip.categories = state.currentLang === 'ar' ? [...state.defaultCategoriesAr] : [...state.defaultCategoriesEn];

    if (!trip.categories.includes(newCat)) {
        trip.categories.push(newCat);
        input.value = '';
        saveTripToCloud(trip);
        updateCategoriesListUI(trip);
        showInteractiveToast(t(`تمت إضافة بند "${newCat}" بنجاح`, `Category "${newCat}" added successfully`), 'add');
    } else {
        alert(t('هذا البند موجود مسبقاً!', 'This category already exists!'));
    }
}

export function editCategoryName(oldName) {
    const trip = getActiveTrip();
    const newName = prompt(t('أدخل الاسم الجديد للبند:', 'Enter new name for category:'), oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        const cleaned = newName.trim();
        const idx = trip.categories.indexOf(oldName);
        if (idx !== -1) {
            trip.categories[idx] = cleaned;
            if (trip.expenses) {
                trip.expenses.forEach(e => {
                    if (e.category === oldName) e.category = cleaned;
                });
            }
            saveTripToCloud(trip);
            updateCategoriesListUI(trip);
            updateExpensesTable(trip);
            showInteractiveToast(t(`تم تعديل البند من "${oldName}" إلى "${cleaned}"`, `Category changed from "${oldName}" to "${cleaned}"`), 'edit');
        }
    }
}

export function deleteCategoryName(catName) {
    const trip = getActiveTrip();
    if (trip.categories.length <= 1) {
        return alert(t('لا يمكن حذف كل البنود! يجب الإبقاء على بند واحد على الأقل.', 'Cannot delete all categories! Keep at least one.'));
    }
    if (confirm(t(`هل أنت متأكد من حذف البند "${catName}"؟`, `Are you sure you want to delete category "${catName}"?`))) {
        trip.categories = trip.categories.filter(c => c !== catName);
        saveTripToCloud(trip);
        updateCategoriesListUI(trip);
        showInteractiveToast(t(`تم حذف البند "${catName}"`, `Category "${catName}" deleted`), 'delete');
    }
}

export function updateCategoryDropdown(trip) {
    const select = document.getElementById('expenseCategory');
    if (!select) return;
    select.innerHTML = '';
    let categories = trip.categories || (state.currentLang === 'ar' ? [...state.defaultCategoriesAr] : [...state.defaultCategoriesEn]);
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        select.appendChild(opt);
    });
}