import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { t, playNotificationBeep } from '../utils/helpers.js';
import { showInteractiveToast } from '../utils/ui-feedback.js';
import { refreshActiveTripUI, updateTripsDropdown } from '../modules/trip-manager.js';

export function saveTripToCloud(trip) {
    if (!trip) return;
    state.isSavingLocally = true;
    setDoc(doc(db, "trips", trip.id), trip).catch(err => {
        console.error("Upload Error:", err);
        state.isSavingLocally = false;
    });
}

export function listenToActiveTripCloud() {
    if (state.unsubscribeActiveTrip) state.unsubscribeActiveTrip();
    if (!state.activeTripId) { refreshActiveTripUI(); return; }

    let isFirstSnapshot = true;

    state.unsubscribeActiveTrip = onSnapshot(doc(db, "trips", state.activeTripId), (docSnap) => {
        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            let idx = state.trips.findIndex(t => t.id === state.activeTripId);

            if (!isFirstSnapshot && !state.isSavingLocally && state.trips[idx]) {
                const oldExp = state.trips[idx].expenses || [];
                const newExp = cloudData.expenses || [];

                let msgAr = '';
                let msgEn = '';
                let type = 'info';

                if (newExp.length > oldExp.length) {
                    const added = newExp.find(ne => !oldExp.some(oe => oe.id === ne.id));
                    if (added) {
                        msgAr = `✨ إضافة مصروف: [${added.description}] بمبلغ (${added.amount.toFixed(0)}) بواسطة ${added.paidBy}`;
                        msgEn = `✨ New expense: [${added.description}] (${added.amount.toFixed(0)}) by ${added.paidBy}`;
                        type = 'add';
                    }
                } else if (newExp.length < oldExp.length) {
                    const removed = oldExp.find(oe => !newExp.some(ne => ne.id === oe.id));
                    if (removed) {
                        msgAr = `🗑️ حذف مصروف: [${removed.description}] (${removed.amount.toFixed(0)})`;
                        msgEn = `🗑️ Deleted expense: [${removed.description}] (${removed.amount.toFixed(0)})`;
                        type = 'delete';
                    }
                } else {
                    const modified = newExp.find(ne => {
                        const oe = oldExp.find(o => o.id === ne.id);
                        return oe && (
                            oe.description !== ne.description ||
                            oe.amount !== ne.amount ||
                            oe.paidBy !== ne.paidBy ||
                            oe.category !== ne.category
                        );
                    });
                    if (modified) {
                        msgAr = `✏️ تعديل مصروف: [${modified.description}] (${modified.amount.toFixed(0)})`;
                        msgEn = `✏️ Modified expense: [${modified.description}] (${modified.amount.toFixed(0)})`;
                        type = 'edit';
                    }
                }

                if (msgAr) {
                    playNotificationBeep();
                    showInteractiveToast(t(msgAr, msgEn), type, () => {
                        const el = document.getElementById('expensesLogSection');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, t('عرض 📋', 'View 📋'));

                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notif = new Notification(t('✈️ تحديث في رحلة: ' + cloudData.name, '✈️ Trip Update: ' + cloudData.name), {
                            body: t(msgAr, msgEn),
                            tag: 'trip-update-' + Date.now()
                        });
                        notif.onclick = function () {
                            window.focus();
                            const el = document.getElementById('expensesLogSection');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        };
                    }
                }
            }

            const fullTrip = {
                id: cloudData.id,
                name: cloudData.name,
                description: cloudData.description || '',
                members: cloudData.members || [],
                expenses: cloudData.expenses || [],
                categories: cloudData.categories || (state.currentLang === 'ar' ? [...state.defaultCategoriesAr] : [...state.defaultCategoriesEn])
            };
            if (idx !== -1) state.trips[idx] = fullTrip;
            else state.trips.push(fullTrip);

            localStorage.setItem('app_trips_data', JSON.stringify(state.trips));
            updateTripsDropdown();
            refreshActiveTripUI();
        } else {
            refreshActiveTripUI();
        }
        state.isSavingLocally = false;
        isFirstSnapshot = false;
    }, (error) => console.error("Sync Error:", error));
}