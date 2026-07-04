import { state } from "./core/state.js";
import {
  toggleLang,
  toggleTheme,
  initSettings,
  switchTab,
} from "./modules/app-settings.js";
import { requestNotificationPermissionUI } from "./utils/ui-feedback.js";
import {
  createNewTrip,
  joinTripById,
  switchTrip,
  clearLocalTracking,
  deleteCurrentTrip,
  updateTripsDropdown,
  refreshActiveTripUI,
} from "./modules/trip-manager.js";
import { addMember, editMemberName } from "./modules/members.js";
import {
  addCategoryFromUI,
  editCategoryName,
  deleteCategoryName,
} from "./modules/categories.js";
import {
  openExpenseModal,
  closeExpenseModal,
  switchExpenseMode,
  addInvoiceItemToArray,
  removeInvoiceItemFromArray,
  updateInvoiceLiveSummary,
  distributeEqually,
  addExpense,
  startEditExpense,
  deleteExpense,
  deleteExpenseFromModal,
  toggleRow,
} from "./modules/expenses.js";
import {
  copyReportToClipboard,
  sendIndividualReport,
} from "./modules/reports.js";
import { listenToActiveTripCloud } from "./core/storage.js";

window.requestNotificationPermissionUI = requestNotificationPermissionUI;
window.toggleLang = toggleLang;
window.toggleTheme = toggleTheme;
window.clearLocalTracking = clearLocalTracking;
window.deleteCurrentTrip = deleteCurrentTrip;
window.createNewTrip = createNewTrip;
window.joinTripById = joinTripById;
window.switchTrip = switchTrip;
window.addMember = addMember;
window.editMemberName = editMemberName;
window.addCategoryFromUI = addCategoryFromUI;
window.editCategoryName = editCategoryName;
window.deleteCategoryName = deleteCategoryName;
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.switchExpenseMode = switchExpenseMode;
window.addInvoiceItemToArray = addInvoiceItemToArray;
window.removeInvoiceItemFromArray = removeInvoiceItemFromArray;
window.updateInvoiceLiveSummary = updateInvoiceLiveSummary;
window.distributeEqually = distributeEqually;
window.addExpense = addExpense;
window.startEditExpense = startEditExpense;
window.deleteExpense = deleteExpense;
window.deleteExpenseFromModal = deleteExpenseFromModal;
window.toggleRow = toggleRow;
window.copyReportToClipboard = copyReportToClipboard;
window.sendIndividualReport = sendIndividualReport;
window.switchTab = switchTab;

window.addEventListener("DOMContentLoaded", () => {
  initSettings();

  const storedTrips = localStorage.getItem("app_trips_data");
  const storedActiveId = localStorage.getItem("app_active_trip_id");
  if (storedTrips) state.trips = JSON.parse(storedTrips);
  if (storedActiveId) state.activeTripId = storedActiveId;

  updateTripsDropdown();
  if (state.activeTripId) {
    listenToActiveTripCloud();
    document.getElementById("managementSubContent")?.classList.remove("hidden");
    document.getElementById("expensesSubContent")?.classList.remove("hidden");
    document.getElementById("reportsSubContent")?.classList.remove("hidden");
    document.querySelectorAll(".no-trip-fallback").forEach((el) => el.classList.add("hidden"));
  } else {
    refreshActiveTripUI();
    document.getElementById("managementSubContent")?.classList.add("hidden");
    document.getElementById("expensesSubContent")?.classList.add("hidden");
    document.getElementById("reportsSubContent")?.classList.add("hidden");
    document.querySelectorAll(".no-trip-fallback").forEach((el) => el.classList.remove("hidden"));
    switchTab("tab-management");
  }
});