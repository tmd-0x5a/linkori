import { useSettingsStore } from "@/stores/settingsStore";
import { translations } from "@/lib/i18n";

/** 現在の言語に対応した翻訳テーブルを返すフック */
export function useT() {
  const lang = useSettingsStore((s) => s.lang);
  return translations[lang];
}
