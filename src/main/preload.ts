import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("launcher", {
  search:  (query: string)    => ipcRenderer.invoke("launcher:search", query),
  execute: (action: string)   => ipcRenderer.invoke("launcher:execute", action),
  hide:    ()                 => ipcRenderer.invoke("launcher:hide"),
  getIcon: (filePath: string) => ipcRenderer.invoke("launcher:get-icon", filePath),
  onShow:  (cb: () => void)   => { ipcRenderer.on("launcher:show", () => cb()); },
});
