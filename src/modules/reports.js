import { state, getActiveTrip } from '../core/state.js';
import { t } from '../utils/helpers.js';
import { showInteractiveToast } from '../utils/ui-feedback.js';
import { generatePaymentPlan } from '../core/calculations.js';

export function drawChart(trip) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (state.myChart) state.myChart.destroy();
    const catTotals = {};
    trip.expenses.forEach(e => { let c = e.category || t('عام', 'General'); catTotals[c] = (catTotals[c] || 0) + e.amount; });
    const labels = Object.keys(catTotals); const data = Object.values(catTotals);
    if (data.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e2e8f0' : '#475569';

    state.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { family: 'sans-serif' } } } }
        }
    });
}

export function buildDetailedReportUI(trip, balances, total) {
    const box = document.getElementById('tripReportContentBox');
    if (!box) return;
    let html = '';
    balances.forEach(b => {
        let cls = b.balance > 0.01 ? 'text-emerald-600 dark:text-emerald-400' : (b.balance < -0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400');
        let txt = b.balance > 0.01 ? `له: +${b.balance.toFixed(1)}` : (b.balance < -0.01 ? `عليه: -${Math.abs(b.balance).toFixed(1)}` : `خالص (0)`);
        let sharePercent = total > 0 ? ((b.owed / total) * 100).toFixed(0) : 0;

        html += `
          <div class="flex flex-col sm:flex-row justify-between sm:items-center text-xs p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 mb-2.5 gap-3 shadow-sm">
            <div class="flex-1">
              <div class="flex justify-between items-center mb-1.5">
                <span class="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1.5">
                  👤 ${b.name}
                </span>
                <span class="font-black ${cls} text-xs px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">${txt}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-300 mt-2 bg-white/60 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                <div>
                  <span class="text-gray-400 block text-[10px]">${t('إجمالي ما دفعه:', 'Total Paid:')}</span>
                  <strong class="text-blue-600 dark:text-blue-400 font-mono text-xs">${b.paid.toFixed(2)}</strong>
                </div>
                <div>
                  <span class="text-gray-400 block text-[10px]">${t('نصيبه من المصروفات:', 'Consumption Share:')}</span>
                  <strong class="text-purple-600 dark:text-purple-400 font-mono text-xs">${b.owed.toFixed(2)}</strong> <span class="text-[9px] text-gray-400">(${sharePercent}%)</span>
                </div>
              </div>
            </div>
            <button onclick="sendIndividualReport('${b.name}')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl transition shadow-sm whitespace-nowrap self-stretch sm:self-center flex items-center justify-center gap-1.5 text-xs">
              <span>💬</span> <span>${t('إرسال واتساب', 'WhatsApp')}</span>
            </button>
          </div>`;
    });
    box.innerHTML = `<div class="max-h-80 overflow-y-auto custom-scrollbar pr-1">${html}</div>`;
}

export function sendIndividualReport(memberName) {
    const trip = getActiveTrip(); const m = trip.members.find(x => x.name === memberName); if (!m) return;
    let mBals = [];
    trip.members.forEach(mbr => {
        let p = trip.expenses.filter(e => e.paidBy === mbr.name).reduce((s, e) => s + e.amount, 0);
        let o = trip.expenses.reduce((s, e) => s + (e.shares[mbr.name] || 0), 0);
        mBals.push({ name: mbr.name, balance: p - o });
    });
    const fullPlan = generatePaymentPlan(mBals);
    const myDebts = fullPlan.filter(p => p.debtor === memberName);

    const bal = mBals.find(x => x.name === memberName).balance;

    let wP = '';
    let wO = '';
    trip.expenses.forEach(e => {
        if (e.paidBy === memberName) {
            wP += `├ 🛒 *${e.category || t('عام', 'Gen')}* ┆ ${e.description} ┆ *${e.amount.toFixed(0)}*\n`;
        }
        if (e.shares[memberName] > 0) {
            wO += `├ 🍽️ *${e.category || t('عام', 'Gen')}* ┆ ${e.description} ┆ *${e.shares[memberName].toFixed(0)}*\n`;
        }
    });

    if (wP !== '') {
        wP = `*╔═══ 💸 تمويلك (مدفوعاتك) ═══╗*\n` + wP + `╚════════════════════╝\n`;
    } else {
        wP = `*╔═══ 💸 تمويلك (مدفوعاتك) ═══╗*\n├ لا توجد مدفوعات مسجلة لك\n╚════════════════════╝\n`;
    }

    if (wO !== '') {
        wO = `*╔═══ 🍽️ استهلاكك (مشاركاتك) ═══╗*\n` + wO + `╚════════════════════╝\n`;
    } else {
        wO = `*╔═══ 🍽️ استهلاكك (مشاركاتك) ═══╗*\n├ لا توجد استهلاكات مسجلة لك\n╚════════════════════╝\n`;
    }

    let planMsg = '';
    if (myDebts.length > 0) {
        planMsg = `\n*┌─── 💳 خطة السداد المطلوبة ───┐*\n`;
        myDebts.forEach(d => planMsg += `│ 📌 ${t('يدفع لـ', 'Pays')} *${d.creditor}* : *${d.amount.toFixed(0)}*\n`);
        planMsg += `*└───────────────────────┘*\n`;
    } else if (bal < -0.01) {
        planMsg = `\n*┌─── 💳 إجمالي المطلوب منك ───┐*\n│ 🔴 المبلغ: *${Math.abs(bal).toFixed(0)}*\n*└───────────────────────┘*\n`;
    }

    let stat = bal > 0.01 ? `🟢 *لك متبقي:* +${bal.toFixed(0)}` : (bal < -0.01 ? `🔴 *مطلوب منك:* -${Math.abs(bal).toFixed(0)}` : `⚪ *حسابك خالص تماماً*`);

    let msg = `أهلاً يا *${m.name}* 👋\n` +
        `📋 هذا كشف حسابك التفصيلي في رحلة:\n` +
        `🌍 *${trip.name}*\n` +
        `════════════════════\n\n` +
        `${wP}\n${wO}\n` +
        `📌 *النتيجة النهائية (الصافي):*\n` +
        `╰ ${stat}\n` +
        `${planMsg}`;

    let cP = (m.phone || '').replace(/\D/g, '');
    if (cP.length === 11 && cP.startsWith('01')) cP = '20' + cP;
    window.open(cP ? `https://api.whatsapp.com/send?phone=${cP}&text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

export function copyReportToClipboard() {
    const trip = getActiveTrip(); if (!trip || trip.members.length === 0) return;
    const tExp = trip.expenses.reduce((s, e) => s + e.amount, 0);
    let mBals = [];
    trip.members.forEach(m => {
        let p = trip.expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + e.amount, 0);
        let o = trip.expenses.reduce((s, e) => s + (e.shares[m.name] || 0), 0);
        mBals.push({ name: m.name, balance: p - o, paid: p, owed: o });
    });

    let txt = `📊 *${t('تقرير:', 'Report:')} ${trip.name}* 📊\n💰 *${t('الإجمالي:', 'Total:')}* ${tExp.toFixed(0)}\n\n👥 *${t('كشف الحسابات:', 'Accounts:')}*\n`;
    mBals.forEach(b => {
        let s = b.balance > 0.01 ? `🟢 +${b.balance.toFixed(0)}` : (b.balance < -0.01 ? `🔴 -${Math.abs(b.balance).toFixed(0)}` : `⚪ 0`);
        txt += `👤 *${b.name}* -> ${t('دفع:', 'Paid:')} ${b.paid.toFixed(0)} | ${t('استهلك:', 'Consumed:')} ${b.owed.toFixed(0)} | ${s}\n`;
    });

    const plan = generatePaymentPlan(mBals);
    txt += `\n💸 *${t('التسوية:', 'Settlement:')}*\n`;
    if (plan.length === 0) txt += `  🎉 ${t('الحسابات مكتملة!', 'All settled!')}\n`;
    else plan.forEach(p => txt += `  🔴 ${p.debtor} [${t('يدفع لـ', 'pays')}] 🟢 ${p.creditor} : *${p.amount.toFixed(0)}*\n`);

    navigator.clipboard.writeText(txt).then(() => showInteractiveToast(t('تم النسخ بنجاح!', 'Copied successfully!'), 'add'));
}