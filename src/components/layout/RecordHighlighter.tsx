import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RECORD_FLASH_MS = 4000;
const TEXT_HIGHLIGHT_MS = 6000;
const WAIT_MS = 12000;
const MAX_MATCHES = 300;
const STYLE_ID = 'search-hit-style';

type HighlightRegistry = { set: (name: string, h: unknown) => void; delete: (name: string) => void };
const registry = (): HighlightRegistry | undefined =>
  (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
const HighlightCtor = () =>
  (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '::highlight(search-hit) { background-color: #FFEB3B; color: #000; }';
  document.head.appendChild(style);
}

/** Finds every occurrence of `term` in the page's main area and returns ranges (no DOM changes, so React is unaffected). */
function findRanges(term: string): Range[] {
  const root = document.querySelector('main') ?? document.body;
  const needle = term.toLowerCase();
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const parent = n.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return n.nodeValue && n.nodeValue.toLowerCase().includes(needle) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node = walker.nextNode();
  while (node && ranges.length < MAX_MATCHES) {
    const text = (node.nodeValue ?? '').toLowerCase();
    let from = 0;
    let idx = text.indexOf(needle, from);
    while (idx !== -1 && ranges.length < MAX_MATCHES) {
      const r = document.createRange();
      r.setStart(node, idx);
      r.setEnd(node, idx + needle.length);
      ranges.push(r);
      from = idx + needle.length;
      idx = text.indexOf(needle, from);
    }
    node = walker.nextNode();
  }
  return ranges;
}

/** Collapsed sections (MUI Collapse) that contain `node`, outermost first. Their content stays in the page but is invisible. */
function hiddenSections(node: Node | null): HTMLElement[] {
  const list: HTMLElement[] = [];
  let el: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (el) {
    if (el.classList.contains('MuiCollapse-hidden')) list.unshift(el);
    el = el.parentElement;
  }
  return list;
}

const MAX_SECTION_OPENS = 8;

/**
 * Runs when a page is opened from global search (…?record=<id>&q=<text>):
 *  - scrolls to and flashes the row/card carrying data-record-id="<id>"
 *  - highlights every occurrence of the searched text for a few seconds
 * Pages load their data after navigation, so it watches the page until the content appears.
 */
export default function RecordHighlighter() {
  const { pathname, search, key } = useLocation(); // key changes even when the same result is clicked twice

  useEffect(() => {
    const params = new URLSearchParams(search);
    const record = params.get('record');
    const term = (params.get('q') ?? '').trim();
    if (!record && term.length < 2) return;

    const selector = record ? `[data-record-id="${CSS.escape(record)}"]` : '';
    let recordDone = !record;
    let textStartedAt = 0;
    let scrolledToText = false;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    const opened = new WeakSet<Element>();
    let opens = 0;

    /** Opens the outermost collapsed section around `node` by clicking its header (the element just before it). Returns true if one was opened. */
    const openSectionAround = (node: Node | null): boolean => {
      if (opens >= MAX_SECTION_OPENS) return false;
      const target = hiddenSections(node).find((h) => !opened.has(h));
      if (!target) return false;
      opened.add(target);
      const header = target.previousElementSibling as HTMLElement | null;
      if (!header) return false;
      opens += 1;
      header.click();
      return true;
    };

    const flashRecord = (el: HTMLElement) => {
      recordDone = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prev = { bg: el.style.backgroundColor, outline: el.style.outline, transition: el.style.transition };
      el.style.transition = 'background-color 0.6s ease, outline-color 0.6s ease';
      el.style.backgroundColor = 'rgba(255, 213, 79, 0.45)';
      el.style.outline = '2px solid #F0A500';
      flashTimer = setTimeout(() => {
        el.style.backgroundColor = prev.bg;
        el.style.outline = prev.outline;
        el.style.transition = prev.transition;
      }, RECORD_FLASH_MS);
    };

    const clearText = () => registry()?.delete('search-hit');

    const applyText = () => {
      const reg = registry();
      const Ctor = HighlightCtor();
      if (!reg || !Ctor || term.length < 2) return;
      if (textStartedAt && Date.now() - textStartedAt > TEXT_HIGHLIGHT_MS) return; // already expired
      const ranges = findRanges(term);
      if (ranges.length === 0) return;
      // A hit inside a collapsed section: open it (one level per pass, so nested sections open in turn).
      if (!record) {
        const hiddenHit = ranges.find((r) => hiddenSections(r.startContainer).length > 0);
        if (hiddenHit) openSectionAround(hiddenHit.startContainer);
      }
      ensureStyle();
      reg.set('search-hit', new Ctor(...ranges));
      if (!textStartedAt) {
        textStartedAt = Date.now();
        clearTimer = setTimeout(clearText, TEXT_HIGHLIGHT_MS);
      }
      // Scroll to the first match. With no record row to go to, do it straight away; otherwise give the
      // row a moment to appear and only fall back to the text if it never does (e.g. a whole-log page).
      if (!scrolledToText) {
        const scrollToText = () => {
          scrollTimer = undefined;
          if (scrolledToText || (record && recordDone)) return;
          const first = findRanges(term).find((r) => hiddenSections(r.startContainer).length === 0);
          if (!first) return; // every match is inside a collapsed section; it is being opened, try again on the next change
          scrolledToText = true;
          first.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        if (!record) scrollToText();
        else if (!scrollTimer) scrollTimer = setTimeout(scrollToText, 1500);
      }
    };

    const run = () => {
      raf = 0;
      if (!recordDone) {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) {
          if (hiddenSections(el).length > 0) openSectionAround(el); // wait for it to open, then flash on the next pass
          else flashRecord(el);
        }
      }
      applyText();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(run); };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    schedule();
    const giveUp = setTimeout(() => observer.disconnect(), WAIT_MS);

    return () => {
      observer.disconnect();
      clearTimeout(giveUp);
      if (raf) cancelAnimationFrame(raf);
      if (flashTimer) clearTimeout(flashTimer);
      if (clearTimer) clearTimeout(clearTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
      clearText();
    };
  }, [pathname, search, key]);

  return null;
}
