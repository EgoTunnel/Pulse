import { contextBridge, ipcRenderer } from 'electron'
import type { LibraryEntry, Presentation } from '@shared/types'
import type { JoinInfo } from '../main/server'

const api = {
  library: {
    list: (): Promise<LibraryEntry[]> => ipcRenderer.invoke('pulse:library:list'),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('pulse:library:remove', id)
  },
  presentation: {
    create: (title: string): Promise<{ presentation: Presentation; filePath: string }> =>
      ipcRenderer.invoke('pulse:presentation:create', title),
    open: (): Promise<{ presentation: Presentation; filePath: string } | null> =>
      ipcRenderer.invoke('pulse:presentation:open'),
    openById: (id: string): Promise<{ presentation: Presentation; filePath: string } | null> =>
      ipcRenderer.invoke('pulse:presentation:openById', id),
    save: (filePath: string, presentation: Presentation): Promise<Presentation> =>
      ipcRenderer.invoke('pulse:presentation:save', filePath, presentation),
    saveAs: (presentation: Presentation): Promise<{ presentation: Presentation; filePath: string } | null> =>
      ipcRenderer.invoke('pulse:presentation:saveAs', presentation),
    duplicate: (id: string): Promise<{ presentation: Presentation; filePath: string } | null> =>
      ipcRenderer.invoke('pulse:presentation:duplicate', id)
  },
  session: {
    start: (presentation: Presentation): Promise<JoinInfo> => ipcRenderer.invoke('pulse:session:start', presentation),
    stop: (): Promise<void> => ipcRenderer.invoke('pulse:session:stop'),
    status: (): Promise<JoinInfo | null> => ipcRenderer.invoke('pulse:session:status')
  }
}

export type PulseApi = typeof api

contextBridge.exposeInMainWorld('pulse', api)
