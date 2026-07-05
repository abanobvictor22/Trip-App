import { state } from "../core/state.js";
import { t, playNotificationBeep } from "./helpers.js";

export function showInteractiveToast(
  message,
  type = "info",
  actionCallback = null,
  actionBtnText = "",
) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");

  let bgBorder = "bg-gray-900 border-gray-700 text-white";
  let icon = "🔔";
  if (type === "add") {
    bgBorder =
      "bg-emerald-900/95 border-emerald-500/50 text-white shadow-emerald-900/30";
    icon = "✨";
  } else if (type === "edit") {
    bgBorder =
      "bg-blue-900/95 border-blue-500/50 text-white shadow-blue-900/30";
    icon = "✏️";
  } else if (type === "delete") {
    bgBorder =
      "bg-rose-900/95 border-rose-500/50 text-white shadow-rose-900/30";
    icon = "🗑️";
  }

  toast.className = `${bgBorder} px-4 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 toast-enter border backdrop-blur-md text-xs md:text-sm font-bold transition-all duration-300`;

  const leftDiv = document.createElement("div");
  leftDiv.className = "flex items-center gap-2.5 overflow-hidden";
  leftDiv.innerHTML = `<span class="text-base">${icon}</span> <span class="truncate leading-relaxed">${message}</span>`;
  toast.appendChild(leftDiv);

  const rightDiv = document.createElement("div");
  rightDiv.className = "flex items-center gap-2 shrink-0";

  if (actionCallback && actionBtnText) {
    const actBtn = document.createElement("button");
    actBtn.className =
      "bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer";
    actBtn.innerText = actionBtnText;
    actBtn.onclick = () => {
      actionCallback();
      removeToast();
    };
    rightDiv.appendChild(actBtn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.className =
    "text-white/60 hover:text-white text-base leading-none font-black transition px-1";
  closeBtn.innerHTML = "✕";
  closeBtn.onclick = () => removeToast();
  rightDiv.appendChild(closeBtn);

  toast.appendChild(rightDiv);
  container.appendChild(toast);

  function removeToast() {
    toast.style.opacity = "0";
    toast.style.transform =
      state.currentLang === "ar" ? "translateX(100%)" : "translateX(-100%)";
    setTimeout(() => toast.remove(), 350);
  }

  setTimeout(removeToast, 6500);
}

export function updateNotificationButtonState() {
  const btn = document.getElementById("notifBtn");
  const txtAr = document.getElementById("notifTextAr");
  const txtEn = document.getElementById("notifTextEn");
  // if (!btn || !('Notification' in window)) { if(btn) btn.style.display = 'none'; return; }
  if (Notification.permission === "granted") {
    btn.classList.add("bg-emerald-500/30", "border-emerald-400");
    txtAr.innerText = "🔔 تنبيهات مفعلة";
    txtEn.innerText = "🔔 Alerts On";
  } else {
    btn.classList.remove("bg-emerald-500/30", "border-emerald-400");
    txtAr.innerText = "🔕 تفعيل التنبيهات";
    txtEn.innerText = "🔕 Enable Alerts";
  }
}

export function requestNotificationPermissionUI() {
  if (!("Notification" in window)) {
    alert(
      t(
        "متصفحك لا يدعم الإشعارات المنبثقة.",
        "Your browser does not support push notifications.",
      ),
    );
    return;
  }
  Notification.requestPermission().then((permission) => {
    updateNotificationButtonState();
    if (permission === "granted") {
      showInteractiveToast(
        t(
          "تم تفعيل التنبيهات المنبثقة بنجاح 🔔",
          "Push notifications enabled successfully 🔔",
        ),
        "add",
      );
      playNotificationBeep();
    } else {
      alert(t("تم رفض الصلاحية من المتصفح.", "Permission denied by browser."));
    }
  });
}
