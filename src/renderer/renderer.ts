export {};

// ── Types ────────────────────────────────────────────────────────────────────

interface LaunchItem {
  id: string;
  label: string;
  subtitle?: string;
  category: "app" | "file" | "action" | "web";
  icon?: string;
  action: string;
}

declare global {
  interface Window {
    launcher: {
      search:  (query: string)    => Promise<LaunchItem[]>;
      execute: (action: string)   => Promise<void>;
      hide:    ()                 => Promise<void>;
      getIcon: (filePath: string) => Promise<string | null>;
      onShow:  (cb: () => void)   => void;
    };
  }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_SUN  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

type Theme = "dark" | "light";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): Theme | null {
  return localStorage.getItem("launcher-theme") as Theme | null;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);

  const btn = document.getElementById("theme-toggle")!;
  btn.innerHTML = theme === "dark" ? ICON_MOON : ICON_SUN;
  btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function initTheme() {
  const stored = getStoredTheme();
  const theme: Theme = stored ?? (systemPrefersDark() ? "dark" : "light");
  applyTheme(theme);

  document.getElementById("theme-toggle")!.addEventListener("click", () => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const next: Theme = current === "dark" ? "light" : "dark";
    localStorage.setItem("launcher-theme", next);
    applyTheme(next);
  });

  // Follow OS changes when no manual override is stored
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!getStoredTheme()) applyTheme(e.matches ? "dark" : "light");
  });
}

// ── Category icons ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  app: "⬡",
  web: "◎",
  action: "⚡",
  file: "◈",
};

const CATEGORY_LABELS: Record<string, string> = {
  app: "Applications",
  web: "Web",
  action: "Actions",
  file: "Files",
};

// ── State ────────────────────────────────────────────────────────────────────

let results: LaunchItem[] = [];
let selectedIndex = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Render ────────────────────────────────────────────────────────────────────

// Updates only the .selected class — never rebuilds HTML (icons stay intact)
function updateSelection() {
  const list = document.getElementById("results-list")!;
  list.querySelectorAll<HTMLLIElement>(".result-item").forEach((el) => {
    el.classList.toggle("selected", Number(el.dataset["index"]) === selectedIndex);
  });
  list.querySelector<HTMLLIElement>(".result-item.selected")
    ?.scrollIntoView({ block: "nearest" });
}

// Full rebuild — only called when the results array changes
function renderResults() {
  const list = document.getElementById("results-list")!;

  if (results.length === 0) {
    list.innerHTML = `<li class="section-sep">No results</li>`;
    return;
  }

  const categoryOrder = ["app", "web", "action", "file"];
  const groups = new Map<string, LaunchItem[]>();
  for (const item of results) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category)!.push(item);
  }
  const sortedGroups = [...groups.entries()].sort(
    ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  let html = "";
  let idx = 0;
  for (const [category, items] of sortedGroups) {
    if (sortedGroups.length > 1) {
      html += `<li class="section-sep">${escapeHtml(CATEGORY_LABELS[category] ?? category)}</li>`;
    }
    for (const item of items) {
      const isSelected = idx === selectedIndex;
      const fallback = CATEGORY_ICONS[item.category] ?? "○";
      html += `
        <li class="result-item${isSelected ? " selected" : ""}" data-index="${idx}" data-action="${escapeHtml(item.action)}">
          <div class="result-icon cat-${escapeHtml(item.category)}" data-icon-idx="${idx}">${fallback}</div>
          <div class="result-text">
            <span class="result-label">${escapeHtml(item.label)}</span>
            ${item.subtitle ? `<span class="result-subtitle">${escapeHtml(item.subtitle)}</span>` : ""}
          </div>
        </li>`;
      idx++;
    }
  }

  list.innerHTML = html;

  // Load real icons progressively — swaps glyph for <img> without re-render
  let iconIdx = 0;
  for (const [, items] of sortedGroups) {
    for (const item of items) {
      const i = iconIdx++;
      if (item.category !== "app" && item.category !== "file") continue;
      const filePath = item.action.replace(/^(open:|exec:)/, "");
      window.launcher.getIcon(filePath).then((dataUrl) => {
        if (!dataUrl) return;
        const el = list.querySelector<HTMLDivElement>(`[data-icon-idx="${i}"]`);
        if (el) el.innerHTML = `<img src="${dataUrl}" width="22" height="22" alt="" aria-hidden="true" style="object-fit:contain;border-radius:4px;">`;
      });
    }
  }

  // Mouse events — use updateSelection instead of renderResults
  list.querySelectorAll<HTMLLIElement>(".result-item").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      selectedIndex = Number(el.dataset["index"]);
      updateSelection();
    });
    el.addEventListener("click", () => {
      selectedIndex = Number(el.dataset["index"]);
      executeSelected();
    });
  });

  list.querySelector<HTMLLIElement>(".result-item.selected")
    ?.scrollIntoView({ block: "nearest" });
}

// ── Search ────────────────────────────────────────────────────────────────────

async function doSearch(query: string) {
  results = await window.launcher.search(query);
  selectedIndex = 0;
  renderResults();
}

function scheduleSearch(query: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => doSearch(query), 60);
}

// ── Execute ───────────────────────────────────────────────────────────────────

function executeSelected() {
  const item = results[selectedIndex];
  if (!item) return;
  window.launcher.execute(item.action);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
      updateSelection();
      break;

    case "ArrowUp":
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
      break;

    case "Tab":
      e.preventDefault();
      if (e.shiftKey) {
        selectedIndex = Math.max(selectedIndex - 1, 0);
      } else {
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
      }
      updateSelection();
      break;

    case "Enter":
      e.preventDefault();
      executeSelected();
      break;

    case "Escape": {
      e.preventDefault();
      const input = document.getElementById("search-input") as HTMLInputElement;
      if (input.value) {
        input.value = "";
        doSearch("");
      } else {
        window.launcher.hide();
      }
      break;
    }
  }
});

// ── Input ─────────────────────────────────────────────────────────────────────

const searchInput = document.getElementById("search-input") as HTMLInputElement;

searchInput.addEventListener("input", () => {
  scheduleSearch(searchInput.value);
});

// ── On show ───────────────────────────────────────────────────────────────────

window.launcher.onShow(() => {
  searchInput.value = "";
  selectedIndex = 0;
  doSearch("");
  setTimeout(() => searchInput.focus(), 50);
});

// ── Init ──────────────────────────────────────────────────────────────────────

initTheme();
doSearch("");
searchInput.focus();
