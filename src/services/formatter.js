// Multilingual candidate slot and calendar event formatter.
import { getTimezoneLabel } from './dateTime.js';

const weekdays = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
};

const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatSlots(slots, language) {
  return slots.map((slot) => formatSlot(slot, language)).join('\n');
}

export function formatSlot(slot, language) {
  const start = new Date(slot.start);
  if (slot.details?.isAllDay) {
    return formatAllDaySlot(start, language);
  }

  const end = new Date(slot.end);
  const startTime = formatTime(start);
  const endTime = formatTime(end);

  if (language === 'en') {
    const timezone = getTimezoneLabel();
    return `${englishMonths[start.getMonth()]} ${start.getDate()} (${weekdays.en[start.getDay()]}) ${startTime}-${endTime}${timezone ? ` ${timezone}` : ''}`;
  }

  if (language === 'zh') {
    return `${start.getMonth() + 1}/${start.getDate()}（${weekdays.zh[start.getDay()]}）${startTime}-${endTime}`;
  }

  return `${start.getMonth() + 1}/${start.getDate()}(${weekdays.ja[start.getDay()]}) ${startTime}〜${endTime}`;
}

function formatAllDaySlot(start, language) {
  if (language === 'en') {
    return `${englishMonths[start.getMonth()]} ${start.getDate()} (${weekdays.en[start.getDay()]}) All day`;
  }

  if (language === 'zh') {
    return `${start.getMonth() + 1}/${start.getDate()}（${weekdays.zh[start.getDay()]}）全天`;
  }

  return `${start.getMonth() + 1}/${start.getDate()}(${weekdays.ja[start.getDay()]}) 終日`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
