import {
  doc,
  getDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../config/firebase.js";
import { state, getActiveTrip } from "../core/state.js";
import { t } from "../utils/helpers.js";
import { saveTripToCloud, listenToActiveTripCloud } from "../core/storage.js";
import { updateMembersListUI, updateExpensePayerDropdown } from "./members.js";
import { updateCategoriesListUI } from "./categories.js";
import {
  renderShareInputs,
  renderInvoiceItemMembersCheckboxes,
  updateExpensesTable,
} from "./expenses.js";
import { calculateEverything } from "../core/calculations.js";

export function createNewTrip() {
  const name = document.getElementById("tripNameInput").value.trim();
  const desc = document.getElementById("tripDescInput").value.trim();
  if (!name)
    return alert(t("الرجاء إدخال اسم الرحلة", "Please enter a trip name"));

  const shortCode = "R" + Math.floor(100000 + Math.random() * 900000);
  const newTrip = {
    id: shortCode,
    name: name,
    description: desc,
    members: [],
    expenses: [],
    categories:
      state.currentLang === "ar"
        ? [...state.defaultCategoriesAr]
        : [...state.defaultCategoriesEn],
  };

  state.activeTripId = shortCode;
  localStorage.setItem("app_active_trip_id", state.activeTripId);
  state.trips.push(newTrip);
  updateTripsDropdown();
  document.getElementById("tripNameInput").value = "";
  document.getElementById("tripDescInput").value = "";
  saveTripToCloud(newTrip);
  listenToActiveTripCloud();
}

export function joinTripById() {
  const code = document
    .getElementById("joinTripCodeInput")
    .value.trim()
    .toUpperCase();
  if (!code) return alert(t("الرجاء إدخال الكود", "Please enter the code"));

  getDoc(doc(db, "trips", code))
    .then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        state.activeTripId = code;
        localStorage.setItem("app_active_trip_id", state.activeTripId);
        if (!state.trips.some((t) => t.id === code)) state.trips.push(data);
        document.getElementById("joinTripCodeInput").value = "";
        updateTripsDropdown();
        listenToActiveTripCloud();
      } else {
        alert(
          t(
            "الكود غير صحيح أو الرحلة غير موجودة.",
            "Invalid code or trip not found.",
          ),
        );
      }
    })
    .catch((err) => alert("Error: " + err.message));
}

export function updateTripsDropdown() {
  const select = document.getElementById("activeTripSelect");
  if (!select) return;
  select.innerHTML = "";
  if (state.trips.length === 0) {
    select.innerHTML = `<option value="">${t("لا توجد رحلات...", "No trips...")}</option>`;
    return;
  }
  state.trips.forEach((trip) => {
    const opt = document.createElement("option");
    opt.value = trip.id;
    opt.textContent = trip.name;
    if (trip.id === state.activeTripId) opt.selected = true;
    select.appendChild(opt);
  });
}

export function switchTrip() {
  state.activeTripId =
    document.getElementById("activeTripSelect").value || null;
  state.editingExpenseId = null;
  localStorage.setItem("app_active_trip_id", state.activeTripId);
  listenToActiveTripCloud();
}

export function clearLocalTracking() {
  if (
    confirm(
      t(
        "تأكيد مسح كل الرحلات المحفوظة من هذا الجهاز بالكامل؟",
        "Clear all saved trips from this device?",
      ),
    )
  ) {
    localStorage.removeItem("app_trips_data");
    localStorage.removeItem("app_active_trip_id");
    state.trips = [];
    state.activeTripId = null;
    if (state.unsubscribeActiveTrip) state.unsubscribeActiveTrip();
    updateTripsDropdown();
    refreshActiveTripUI();
  }
}

export function deleteCurrentTrip() {
  if (!state.activeTripId) return;
  if (
    !confirm(
      t(
        "هل أنت متأكد من مسح هذه الرحلة فقط؟ سيتم حذفها نهائياً من حسابك.",
        "Are you sure you want to delete this specific trip?",
      ),
    )
  )
    return;

  const tripIdToDelete = state.activeTripId;
  //   try {
  //     await deleteDoc(doc(db, "trips", tripIdToDelete));
  //   } catch (err) {
  //     console.warn("Could not delete from cloud or already deleted:", err);
  //   }

  state.trips = state.trips.filter((t) => t.id !== tripIdToDelete);
  localStorage.setItem("app_trips_data", JSON.stringify(state.trips));
  if (state.unsubscribeActiveTrip) {
    state.unsubscribeActiveTrip();
    state.unsubscribeActiveTrip = null;
  }
  state.activeTripId = state.trips.length > 0 ? state.trips[0].id : null;

  if (state.activeTripId) {
    localStorage.setItem("app_active_trip_id", state.activeTripId);
    updateTripsDropdown();
    listenToActiveTripCloud();
  } else {
    localStorage.removeItem("app_active_trip_id");
    updateTripsDropdown();
    refreshActiveTripUI();
  }
}

export function refreshActiveTripUI() {
  // 1. جلب الرحلة النشطة
  const currentTrip = getActiveTrip();

  // 2. ربط حاويات المحتوى في التابات الثلاثة (حسب الـ HTML الجديد)
  const managementSubContent = document.getElementById("managementSubContent");
  const expensesSubContent = document.getElementById("expensesSubContent");
  const reportsSubContent = document.getElementById("reportsSubContent");

  // 3. ربط شاشات "لم يتم تحديد رحلة" (الموجودة في تاب المصروفات والتقارير)
  const fallbacks = document.querySelectorAll(".no-trip-fallback");

  // 4. ربط عناصر الـ Header (صندوق المعلومات وزر المسح)
  const infoBox = document.getElementById("currentTripInfoBox");
  const deleteBtn = document.getElementById("deleteTripBtn");

  // ----------------------------------------------------------------
  // الحالة الأولى: لا توجد رحلة نشطة أو الرحلة فارغة تماماً
  // ----------------------------------------------------------------
  if (!currentTrip || !currentTrip.members) {
    // إخفاء المحتوى الفعلي من جميع التابات
    if (managementSubContent) managementSubContent.classList.add("hidden");
    if (expensesSubContent) expensesSubContent.classList.add("hidden");
    if (reportsSubContent) reportsSubContent.classList.add("hidden");

    // إخفاء الشريط العلوي
    if (infoBox) infoBox.classList.add("hidden");
    if (deleteBtn) deleteBtn.classList.add("hidden");

    // إظهار شاشة (السحابة ☁️ / لم يتم تحديد رحلة) في التابات
    fallbacks.forEach((el) => el.classList.remove("hidden"));
    return;
  }

  // ----------------------------------------------------------------
  // الحالة الثانية: تم تحديد رحلة بنجاح
  // ----------------------------------------------------------------
  // إظهار المحتوى الفعلي في جميع التابات
  if (managementSubContent) managementSubContent.classList.remove("hidden");
  if (expensesSubContent) expensesSubContent.classList.remove("hidden");
  if (reportsSubContent) reportsSubContent.classList.remove("hidden");

  // إظهار الشريط العلوي للرحلة
  if (infoBox) infoBox.classList.remove("hidden");
  if (deleteBtn) deleteBtn.classList.remove("hidden");

  // إخفاء الشاشات التحذيرية (السحابة)
  fallbacks.forEach((el) => el.classList.add("hidden"));

  // تحديث بيانات البار العلوي (الوصف والكود)
  if (infoBox) {
    infoBox.innerHTML = `
            <div class="flex-1"><strong>${typeof t === "function" ? t("الوصف:", "Description:") : "الوصف:"}</strong> ${currentTrip.description || "-"}</div>
            <div class="bg-blue-600 text-white font-mono px-4 py-1.5 rounded-lg font-bold text-center select-all shadow-sm">
                🔑 ${typeof t === "function" ? t("الكود:", "Code:") : "الكود:"} ${currentTrip.id}
            </div>
        `;
  }

  // ----------------------------------------------------------------
  // استدعاء جميع الدوال المسؤولة عن تحديث الجداول والقوائم الفرعية
  // ----------------------------------------------------------------
  if (typeof updateMembersListUI === "function")
    updateMembersListUI(currentTrip);
  if (typeof updateExpensePayerDropdown === "function")
    updateExpensePayerDropdown(currentTrip);
  if (typeof updateCategoriesListUI === "function")
    updateCategoriesListUI(currentTrip);
  if (typeof renderShareInputs === "function") renderShareInputs(currentTrip);
  if (typeof renderInvoiceItemMembersCheckboxes === "function")
    renderInvoiceItemMembersCheckboxes(currentTrip);
  if (typeof updateExpensesTable === "function")
    updateExpensesTable(currentTrip);
  if (typeof calculateEverything === "function")
    calculateEverything(currentTrip);
}
