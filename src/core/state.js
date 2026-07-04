export const state = {
    trips: [],
    activeTripId: null,
    editingExpenseId: null,
    currentExpenseMode: 'simple',
    tempInvoiceItems: [],
    currentLang: 'ar',
    myChart: null,
    isSavingLocally: false,
    unsubscribeActiveTrip: null,
    defaultCategoriesAr: ['عام', 'طعام', 'سكن', 'مواصلات', 'أنشطة', 'مشتريات'],
    defaultCategoriesEn: ['General', 'Food', 'Housing', 'Transport', 'Activities', 'Shopping']
};

export function getActiveTrip() {
    return state.trips.find(t => t.id === state.activeTripId);
}