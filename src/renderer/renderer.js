"use strict";
// ── Types ────────────────────────────────────────────────────────────────────
// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    app: "⬡",
    web: "◎",
    action: "⚡",
    file: "◈",
};
const CATEGORY_LABELS = {
    app: "Applications",
    web: "Web",
    action: "Actions",
    file: "Files",
};
// ── State ────────────────────────────────────────────────────────────────────
let results = [];
let selectedIndex = 0;
let debounceTimer = null;
// ── Utilities ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
// ── Render ────────────────────────────────────────────────────────────────────
function renderResults() {
    const list = document.getElementById("results-list");
    if (results.length === 0) {
        list.innerHTML = `<li class="section-sep">No results</li>`;
        return;
    }
    // Group by category
    const groups = new Map();
    for (const item of results) {
        if (!groups.has(item.category))
            groups.set(item.category, []);
        groups.get(item.category).push(item);
    }
    let html = "";
    let globalIndex = 0;
    const categoryOrder = ["app", "web", "action", "file"];
    const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
    });
    for (const [category, items] of sortedGroups) {
        // Only show section headers if more than one category
        if (sortedGroups.length > 1) {
            html += `<li class="section-sep">${escapeHtml(CATEGORY_LABELS[category] ?? category)}</li>`;
        }
        for (const item of items) {
            const idx = globalIndex++;
            const isSelected = idx === selectedIndex;
            const icon = CATEGORY_ICONS[item.category] ?? "○";
            html += `
        <li class="result-item${isSelected ? " selected" : ""}" data-index="${idx}" data-action="${escapeHtml(item.action)}">
          <div class="result-icon cat-${escapeHtml(item.category)}">${icon}</div>
          <div class="result-text">
            <span class="result-label">${escapeHtml(item.label)}</span>
            ${item.subtitle ? `<span class="result-subtitle">${escapeHtml(item.subtitle)}</span>` : ""}
          </div>
        </li>`;
        }
    }
    list.innerHTML = html;
    // Attach mouse events
    list.querySelectorAll(".result-item").forEach((el) => {
        el.addEventListener("mouseenter", () => {
            selectedIndex = Number(el.dataset["index"]);
            renderResults();
        });
        el.addEventListener("click", () => {
            selectedIndex = Number(el.dataset["index"]);
            executeSelected();
        });
    });
    // Scroll selected item into view
    const selectedEl = list.querySelector(".result-item.selected");
    selectedEl?.scrollIntoView({ block: "nearest" });
}
// ── Search ────────────────────────────────────────────────────────────────────
async function doSearch(query) {
    results = await window.launcher.search(query);
    selectedIndex = 0;
    renderResults();
}
function scheduleSearch(query) {
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(query), 60);
}
// ── Execute ───────────────────────────────────────────────────────────────────
function executeSelected() {
    const item = results[selectedIndex];
    if (!item)
        return;
    window.launcher.execute(item.action);
}
// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowDown":
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
            renderResults();
            break;
        case "ArrowUp":
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderResults();
            break;
        case "Tab":
            e.preventDefault();
            if (e.shiftKey) {
                selectedIndex = Math.max(selectedIndex - 1, 0);
            }
            else {
                selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
            }
            renderResults();
            break;
        case "Enter":
            e.preventDefault();
            executeSelected();
            break;
        case "Escape": {
            e.preventDefault();
            const input = document.getElementById("search-input");
            if (input.value) {
                input.value = "";
                doSearch("");
            }
            else {
                window.launcher.hide();
            }
            break;
        }
    }
});
// ── Input ─────────────────────────────────────────────────────────────────────
const searchInput = document.getElementById("search-input");
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
doSearch("");
searchInput.focus();
