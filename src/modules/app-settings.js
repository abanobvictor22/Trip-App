import { state, getActiveTrip } from "../core/state.js";
import { t } from "../utils/helpers.js";
import { updateNotificationButtonState } from "../utils/ui-feedback.js";
import { calculateEverything } from "../core/calculations.js";
import { refreshActiveTripUI, updateTripsDropdown } from "./trip-manager.js";

export function toggleLang() {
  setLang(state.currentLang === "ar" ? "en" : "ar");
}

export function setLang(lang) {
  state.currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  localStorage.setItem("app_lang", lang);

  if (getActiveTrip()) refreshActiveTripUI();
  else updateTripsDropdown();
  const themeIconAr = document.getElementById("themeIconAr");
  const themeIconEn = document.getElementById("themeIconEn");

  if (lang == "ar") {
    themeIconAr.classList.remove("hidden");
    themeIconEn.classList.add("hidden");
  } else {
    themeIconAr.classList.add("hidden");
    themeIconEn.classList.remove("hidden");
  }

  const inpName = document.getElementById("tripNameInput");
  if (inpName)
    inpName.placeholder = t(
      "اسم الرحلة (مثلاً: دهب 2026)",
      "Trip Name (e.g. Dahab 2026)",
    );
  const inpDesc = document.getElementById("tripDescInput");
  if (inpDesc) inpDesc.placeholder = t("معلومات عنها", "Trip Description");
  const inpCode = document.getElementById("joinTripCodeInput");
  if (inpCode) inpCode.placeholder = t("اكتب الكود هنا", "Enter Code Here");
  const inpMemName = document.getElementById("memberNameInput");
  if (inpMemName) inpMemName.placeholder = t("اسم الشخص", "Name");
  const inpMemPhone = document.getElementById("memberPhoneInput");
  if (inpMemPhone) inpMemPhone.placeholder = t("رقم الموبايل", "Phone Number");
  const inpExpDesc = document.getElementById("expenseDesc");
  if (inpExpDesc)
    inpExpDesc.placeholder = t(
      "غداء بمطعم، تذاكر...",
      "Restaurant, Tickets...",
    );
  const inpInvName = document.getElementById("invoiceItemName");
  if (inpInvName) inpInvName.placeholder = t("اسم البند", "Item Name");
  const inpInvPrice = document.getElementById("invoiceItemPrice");
  if (inpInvPrice) inpInvPrice.placeholder = t("السعر", "Price");
  const inpNewCat = document.getElementById("newCategoryInput");
  if (inpNewCat)
    inpNewCat.placeholder = t("اسم بند جديد...", "New Category Name...");
}

export function toggleTheme() {
  const htmlClasses = document.documentElement.classList;
  htmlClasses.toggle("dark");
  const isDark = htmlClasses.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons(isDark);
  if (getActiveTrip()) calculateEverything(getActiveTrip());
}

export function updateThemeIcons(isDark) {
  const elAr = document.getElementById("themeIconAr");
  const elEn = document.getElementById("themeIconEn");
  if (elAr) elAr.innerText = isDark ? "☀️ نهاري" : "🌙 ليلي";
  if (elEn) elEn.innerText = isDark ? "☀️ Light" : "🌙 Dark";
}

export function initSettings() {
  const savedLang = localStorage.getItem("app_lang");
  if (savedLang) setLang(savedLang);
  else setLang("ar");

  const savedTheme = localStorage.getItem("theme");
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    updateThemeIcons(true);
  } else {
    updateThemeIcons(false);
  }
  updateNotificationButtonState();
}

export function switchTab(tabId) {
  // 1. إخفاء كل حاويات التابات الرئيسية
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.add("hidden");
    pane.classList.remove("block");
  });

  // 2. إظهار التاب المختار فقط
  const activePane = document.getElementById(tabId);
  if (activePane) {
    activePane.classList.remove("hidden");
    activePane.classList.add("block");
  }

  // 3. إعادة تهيئة مظهر جميع أزرار التبديل للحالة الافتراضية
  const inactiveClasses =
    "tab-btn px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ml-1 rtl:mr-1 rtl:ml-0";
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.className = inactiveClasses;
  });

  // 4. تمييز وتصميم الزر النشط حالياً
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.className =
      "tab-btn px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 bg-blue-600 text-white shadow-sm";
  }
}
