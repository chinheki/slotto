// Supported-site content bridge for inserting generated text and displaying
// animated upcoming-event reminder mascots.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SHOW_EVENT_REMINDER') {
    showEventReminder(message.payload);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type !== 'INSERT_TEXT') {
    return false;
  }

  const target = document.activeElement;
  if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = `${target.value.slice(0, start)}${message.text}${target.value.slice(end)}`;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    sendResponse({ ok: true });
    return true;
  }

  const editable = target?.closest?.('[contenteditable="true"]');
  if (editable) {
    document.execCommand('insertText', false, message.text);
    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ ok: false, reason: 'No editable field is focused.' });
  return true;
});

function showEventReminder(payload = {}) {
  document.querySelector('#slotto-event-reminder')?.remove();

  const root = document.createElement('div');
  root.id = 'slotto-event-reminder';
  root.style.cssText = [
    'all:initial',
    'position:fixed',
    'z-index:2147483647',
    'top:18px',
    'right:18px',
    'display:flex',
    'align-items:flex-end',
    'gap:8px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'pointer-events:auto'
  ].join(';');

  const shadow = root.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .wrap { display: flex; align-items: flex-end; gap: 8px; animation: enter .32s cubic-bezier(.2,.85,.3,1.15) both; }
    .mascot { width: 112px; height: 112px; object-fit: contain; image-rendering: pixelated; animation: hop .72s ease-in-out 2; }
    .bubble { position: relative; max-width: 270px; border: 2px solid #0f2f46; border-radius: 8px; padding: 11px 34px 11px 13px; color: #102a3c; background: #fffdf4; box-shadow: 4px 5px 0 rgba(15,47,70,.2); }
    .bubble::after { content: ''; position: absolute; right: -10px; bottom: 16px; width: 16px; height: 16px; border-top: 2px solid #0f2f46; border-right: 2px solid #0f2f46; background: #fffdf4; transform: rotate(45deg); }
    .message { display: block; font-size: 14px; font-weight: 700; line-height: 1.45; letter-spacing: 0; overflow-wrap: anywhere; }
    .time { display: block; margin-top: 3px; color: #52697a; font-size: 12px; line-height: 1.35; }
    .close { position: absolute; top: 5px; right: 6px; width: 26px; height: 26px; border: 0; padding: 0; color: #52697a; background: transparent; font: 20px/26px sans-serif; cursor: pointer; }
    @keyframes enter { from { opacity: 0; transform: translateY(-16px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes hop { 0%,100% { transform: translateY(0) rotate(0); } 35% { transform: translateY(-14px) rotate(-3deg); } 65% { transform: translateY(0) rotate(2deg); } }
    @media (max-width: 520px) { .mascot { width: 84px; height: 84px; } .bubble { max-width: min(230px, 62vw); } }
    @media (prefers-reduced-motion: reduce) { .mascot { animation: none; } }
  `;

  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const message = document.createElement('span');
  message.className = 'message';
  message.textContent = payload.message || payload.title || 'Slotto reminder';
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = payload.timeLabel || '';
  const close = document.createElement('button');
  close.className = 'close';
  close.type = 'button';
  close.setAttribute('aria-label', payload.closeLabel || 'Close reminder');
  close.textContent = '×';
  close.addEventListener('click', () => root.remove());
  const mascot = document.createElement('img');
  mascot.className = 'mascot';
  mascot.alt = '';
  mascot.src = chrome.runtime.getURL('assets/reminders/character.png');

  bubble.append(message, time, close);
  wrap.append(bubble, mascot);
  shadow.append(style, wrap);
  document.documentElement.append(root);
  window.setTimeout(() => root.remove(), 20000);
}
