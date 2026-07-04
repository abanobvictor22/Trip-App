import { t } from '../utils/helpers.js';
import { drawChart, buildDetailedReportUI } from '../modules/reports.js';

export function generatePaymentPlan(balances) {
    let b = JSON.parse(JSON.stringify(balances));
    let debtors = b.filter(x => x.balance < -0.01).map(x => ({ name: x.name, amount: Math.abs(x.balance) }));
    let creditors = b.filter(x => x.balance > 0.01).map(x => ({ name: x.name, amount: x.balance }));
    let plan = [];
    let i = 0; let j = 0;
    while (i < debtors.length && j < creditors.length) {
        let d = debtors[i]; let c = creditors[j];
        let pay = Math.min(d.amount, c.amount);
        if (pay > 0.01) plan.push({ debtor: d.name, creditor: c.name, amount: pay });
        d.amount -= pay; c.amount -= pay;
        if (d.amount <= 0.01) i++;
        if (c.amount <= 0.01) j++;
    }
    return plan;
}

export function calculateEverything(trip) {
    if (!trip.expenses) trip.expenses = [];
    const totalE = trip.expenses.reduce((s, e) => s + e.amount, 0);
    document.getElementById('totalTripExpenses').textContent = totalE.toFixed(2);
    document.getElementById('totalInvoices').textContent = trip.expenses.length;

    const setList = document.getElementById('settlementList');
    const planList = document.getElementById('paymentPlanList');
    if (trip.members.length === 0) {
        setList.innerHTML = `<p class="text-xs text-center text-gray-400 py-2">${t('لا أفراد', 'No members')}</p>`;
        planList.innerHTML = `<p class="text-xs text-center text-gray-400 py-2">-</p>`;
        document.getElementById('tripReportContentBox').innerHTML = '';
        drawChart(trip);
        return;
    }

    let mBals = [];
    setList.innerHTML = '';
    trip.members.forEach(m => {
        let pd = trip.expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + e.amount, 0);
        let ow = trip.expenses.reduce((s, e) => s + (e.shares[m.name] || 0), 0);
        let bal = pd - ow;
        mBals.push({ name: m.name, balance: bal, paid: pd, owed: ow });

        const div = document.createElement('div');
        div.className = "p-3 rounded-xl flex justify-between items-center border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm";
        if (bal > 0.01) {
            div.innerHTML = `<span class="text-sm font-bold text-gray-800 dark:text-gray-200">👤 ${m.name}</span> <span class="text-emerald-600 dark:text-emerald-400 font-black text-sm">${t('له:', 'Net:')} +${bal.toFixed(1)}</span>`;
        } else if (bal < -0.01) {
            div.innerHTML = `<span class="text-sm font-bold text-gray-800 dark:text-gray-200">👤 ${m.name}</span> <span class="text-rose-600 dark:text-rose-400 font-black text-sm">${t('عليه:', 'Net:')} -${Math.abs(bal).toFixed(1)}</span>`;
        } else {
            div.innerHTML = `<span class="text-sm font-bold text-gray-800 dark:text-gray-200">👤 ${m.name}</span> <span class="text-gray-400 font-bold text-xs">${t('خالص', 'Settled')}</span>`;
        }
        setList.appendChild(div);
    });

    const plan = generatePaymentPlan(mBals);
    planList.innerHTML = '';
    if (plan.length === 0) {
        planList.innerHTML = `<p class="text-sm text-center text-indigo-500 font-bold py-2">🎉 ${t('الكل خالص', 'All Settled')}</p>`;
    } else {
        plan.forEach(p => {
            const div = document.createElement('div');
            div.className = "p-2.5 bg-white dark:bg-gray-800 rounded-xl flex justify-between items-center text-xs shadow-sm border border-indigo-50 dark:border-indigo-900/30";
            div.innerHTML = `<div class="flex items-center gap-1.5"><span class="font-bold text-rose-600 dark:text-rose-400 truncate max-w-[70px]">${p.debtor}</span><span class="text-gray-500 dark:text-gray-400 font-semibold px-1 text-[11px]">${t('يدفع لـ', 'pays')}</span><span class="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[70px]">${p.creditor}</span></div><div class="font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded">${p.amount.toFixed(1)}</div>`;
            planList.appendChild(div);
        });
    }

    buildDetailedReportUI(trip, mBals, totalE);
    drawChart(trip);
}