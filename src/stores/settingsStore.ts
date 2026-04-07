import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

interface SettingsState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  lang: "ja",
  setLang: (lang) => set({ lang }),
  toggleLang: () => set({ lang: get().lang === "ja" ? "en" : "ja" }),
}));
