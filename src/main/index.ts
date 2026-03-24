import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from "electron";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Types ────────────────────────────────────────────────────────────────────

interface LaunchItem {
  id: string;
  label: string;
  subtitle?: string;
  category: "app" | "file" | "action" | "web";
  icon?: string;
  action: string;
}

// ── Built-in items ───────────────────────────────────────────────────────────

const BUILT_IN: LaunchItem[] = [
  {
    id: "sleep",
    label: "Sleep",
    subtitle: "Put the computer to sleep",
    category: "action",
    action: "action:sleep",
  },
  {
    id: "lock",
    label: "Lock Screen",
    subtitle: "Lock the screen",
    category: "action",
    action: "action:lock",
  },
  {
    id: "trash",
    label: "Empty Trash",
    subtitle: "Permanently delete trashed files",
    category: "action",
    action: "action:trash",
  },
  {
    id: "github",
    label: "GitHub",
    subtitle: "github.com",
    category: "web",
    action: "url:https://github.com",
  },
  {
    id: "google",
    label: "Google",
    subtitle: "google.com",
    category: "web",
    action: "url:https://google.com",
  },
  {
    id: "claude",
    label: "Claude",
    subtitle: "claude.ai",
    category: "web",
    action: "url:https://claude.ai",
  },
];

// ── App discovery ────────────────────────────────────────────────────────────

async function discoverApps(): Promise<LaunchItem[]> {
  const items: LaunchItem[] = [];
  const platform = process.platform;

  if (platform === "darwin") {
    const dirs = ["/Applications", path.join(os.homedir(), "Applications")];
    for (const dir of dirs) {
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry.endsWith(".app")) {
            const name = entry.replace(/\.app$/, "");
            const appPath = path.join(dir, entry);
            items.push({
              id: `app-${appPath}`,
              label: name,
              subtitle: appPath,
              category: "app",
              action: `open:${appPath}`,
            });
          }
        }
      } catch {
        // dir may not exist
      }
    }
  } else if (platform === "win32") {
    const dirs = [
      process.env["ProgramFiles"] ?? "C:\\Program Files",
      process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
      path.join(os.homedir(), "AppData", "Local", "Programs"),
    ];
    function scanDir(dir: string, depth: number) {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry.name.endsWith(".exe")) {
            const name = entry.name.replace(/\.exe$/i, "");
            items.push({
              id: `app-${fullPath}`,
              label: name,
              subtitle: fullPath,
              category: "app",
              action: `open:${fullPath}`,
            });
          }
        }
      } catch {
        // skip inaccessible dirs
      }
    }
    for (const dir of dirs) {
      scanDir(dir, 0);
    }
  } else if (platform === "linux") {
    const appDir = "/usr/share/applications";
    try {
      const files = fs.readdirSync(appDir).filter((f) => f.endsWith(".desktop"));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(appDir, file), "utf-8");
          const nameLine = content.split("\n").find((l) => l.startsWith("Name="));
          const execLine = content.split("\n").find((l) => l.startsWith("Exec="));
          if (nameLine && execLine) {
            const name = nameLine.replace("Name=", "").trim();
            const exec = execLine
              .replace("Exec=", "")
              .trim()
              .replace(/%[uUfFdDnNickvm]/g, "")
              .trim();
            items.push({
              id: `app-${file}`,
              label: name,
              subtitle: exec,
              category: "app",
              action: `exec:${exec}`,
            });
          }
        } catch {
          // skip malformed desktop files
        }
      }
    } catch {
      // appDir may not exist
    }
  }

  return items;
}

// ── Fuzzy search ─────────────────────────────────────────────────────────────

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;

  // subsequence check
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) {
    return 20 + Math.floor((q.length / t.length) * 20);
  }

  return 0;
}

function search(query: string, allItems: LaunchItem[]): LaunchItem[] {
  const trimmed = query.trim();

  if (trimmed.startsWith("? ") || trimmed.startsWith("search ")) {
    const q = trimmed.replace(/^(\? |search )/, "").trim();
    const webItem: LaunchItem = {
      id: "live-search",
      label: `Search "${q}"`,
      subtitle: "Open in Google",
      category: "web",
      action: `url:https://www.google.com/search?q=${encodeURIComponent(q)}`,
    };
    const rest = search(q, allItems).slice(0, 9);
    return [webItem, ...rest];
  }

  if (!trimmed) {
    return allItems.slice(0, 10);
  }

  const scored = allItems
    .map((item) => {
      const labelScore = fuzzyScore(trimmed, item.label);
      const subtitleScore = item.subtitle
        ? fuzzyScore(trimmed, item.subtitle) * 0.5
        : 0;
      return { item, score: Math.max(labelScore, subtitleScore) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.item);

  return scored;
}

// ── Action execution ─────────────────────────────────────────────────────────

async function executeAction(action: string): Promise<void> {
  const platform = process.platform;

  if (action.startsWith("url:")) {
    await shell.openExternal(action.slice(4));
    return;
  }

  if (action.startsWith("open:")) {
    await shell.openPath(action.slice(5));
    return;
  }

  if (action.startsWith("exec:")) {
    const cmd = action.slice(5);
    const child = spawn(cmd, {
      detached: true,
      shell: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  if (action === "action:sleep") {
    if (platform === "darwin") {
      spawn("pmset", ["sleepnow"], { detached: true, stdio: "ignore" }).unref();
    } else if (platform === "win32") {
      spawn("rundll32.exe", ["powrprof.dll,SetSuspendState", "0", "1", "0"], {
        detached: true,
        stdio: "ignore",
        shell: true,
      }).unref();
    } else {
      spawn("systemctl", ["suspend"], { detached: true, stdio: "ignore" }).unref();
    }
    return;
  }

  if (action === "action:lock") {
    if (platform === "darwin") {
      spawn(
        "/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession",
        ["-suspend"],
        { detached: true, stdio: "ignore" }
      ).unref();
    } else if (platform === "win32") {
      spawn("rundll32.exe", ["user32.dll,LockWorkStation"], {
        detached: true,
        stdio: "ignore",
        shell: true,
      }).unref();
    } else {
      spawn("loginctl", ["lock-session"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    }
    return;
  }

  if (action === "action:trash") {
    if (platform === "darwin") {
      spawn("osascript", ["-e", 'tell application "Finder" to empty trash'], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else if (platform === "win32") {
      // PowerShell: clear recycle bin
      spawn(
        "powershell",
        ["-Command", "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"],
        { detached: true, stdio: "ignore", shell: true }
      ).unref();
    } else {
      spawn("gio", ["trash", "--empty"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    }
    return;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

let win: BrowserWindow | null = null;
let allItems: LaunchItem[] = [...BUILT_IN];

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 640;
  const winHeight = 480;
  const x = Math.round((sw - winWidth) / 2);
  const y = Math.round(sh * 0.28);

  win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: false,
    backgroundColor: "#0d0d10",
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "../../src/renderer/index.html"));

  win.on("blur", () => {
    win?.hide();
  });
}

function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
    win.webContents.send("launcher:show");
  }
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle("launcher:search", (_event, query: string) => {
  return search(query, allItems);
});

ipcMain.handle("launcher:execute", async (_event, action: string) => {
  await executeAction(action);
  win?.hide();
});

ipcMain.handle("launcher:hide", () => {
  win?.hide();
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const discovered = await discoverApps();
  allItems = [...BUILT_IN, ...discovered];

  createWindow();

  const shortcut = process.platform === "darwin" ? "Command+Space" : "Ctrl+Space";
  globalShortcut.register(shortcut, toggleWindow);

  setTimeout(() => {
    win?.show();
    win?.focus();
    win?.webContents.send("launcher:show");
  }, 300);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
