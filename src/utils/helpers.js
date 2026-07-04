import { state } from '../core/state.js';

export function t(arText, enText) {
    return state.currentLang === 'en' ? enText : arText;
}

export function playNotificationBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { }
}

export function getLocalIsoString() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
}

export function formatToDateTimeLocalString(val) {
    if (!val) return getLocalIsoString();
    try {
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
            return val.slice(0, 16);
        }

        let dt;
        if (typeof val === 'object' && val.seconds) {
            dt = new Date(val.seconds * 1000);
        } else if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val) && val.trim() !== '')) {
            let num = Number(val);
            if (num < 10000000000) num *= 1000;
            dt = new Date(num);
        } else {
            dt = new Date(val);
        }

        if (!dt || isNaN(dt.getTime())) {
            if (typeof val === 'string') {
                let cleanStr = val.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                    .replace(/[\u200E\u200F\u061C\u200B-\u200D\uFEFF]/g, '')
                    .trim();

                let isPM = /م|مساء|pm/i.test(cleanStr);
                let isAM = /ص|صباح|am/i.test(cleanStr);
                cleanStr = cleanStr.replace(/[مص]|مساء|صباح|am|pm/gi, '').trim();

                const monthMap = {
                    'كانون الثاني': 1, 'تشرين الثاني': 11, 'تشرين الأول': 10, 'كانون الأول': 12,
                    'يناير': 1, 'جانفي': 1, 'فبراير': 2, 'فيفري': 2, 'شباط': 2, 'مارس': 3, 'آذار': 3,
                    'أبريل': 4, 'أفريل': 4, 'نيسان': 4, 'مايو': 5, 'ماي': 5, 'أيار': 5, 'يونيو': 6,
                    'جوان': 6, 'حزيران': 6, 'يوليو': 7, 'جويلية': 7, 'تموز': 7, 'أغسطس': 8, 'أوت': 8,
                    'آب': 8, 'سبتمبر': 9, 'أيلول': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
                };

                const sortedMonths = Object.keys(monthMap).sort((a, b) => b.length - a.length);
                for (const mName of sortedMonths) {
                    if (cleanStr.includes(mName)) {
                        const mVal = monthMap[mName];
                        cleanStr = cleanStr.replace(new RegExp('\\s*' + mName + '\\s*'), '-' + mVal + '-');
                        break;
                    }
                }

                let dateParts = cleanStr.match(/(\d{1,4})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{1,4}))?/);
                let timeParts = cleanStr.match(/(\d{1,2}):(\d{2})/);

                if (dateParts) {
                    let p1 = parseInt(dateParts[1], 10);
                    let p2 = parseInt(dateParts[2], 10);
                    let p3 = dateParts[3] ? parseInt(dateParts[3], 10) : null;

                    let year = new Date().getFullYear();
                    let month = 1;
                    let day = 1;

                    if (p1 > 1000) { year = p1; month = p2; day = p3 || 1; }
                    else if (p3 && p3 > 1000) { day = p1; month = p2; year = p3; }
                    else { day = p1; month = p2; }

                    let hours = 0;
                    let minutes = 0;
                    if (timeParts) {
                        hours = parseInt(timeParts[1], 10);
                        minutes = parseInt(timeParts[2], 10);
                        if (isPM && hours < 12) hours += 12;
                        if (isAM && hours === 12) hours = 0;
                    }

                    dt = new Date(year, month - 1, day, hours, minutes);
                }
            }
        }

        if (!dt || isNaN(dt.getTime())) return getLocalIsoString();

        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const hours = String(dt.getHours()).padStart(2, '0');
        const minutes = String(dt.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        return getLocalIsoString();
    }
}

export function formatDateString(isoString) {
    if (!isoString) return '';
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return String(isoString);
    return dt.toLocaleDateString(state.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}