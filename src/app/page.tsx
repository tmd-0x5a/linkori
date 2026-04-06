"use client";

import { useState } from "react";
import { usePersistence } from "@/hooks/usePersistence";
import { PlaylistPanel } from "@/components/playlist/PlaylistPanel";
import { ViewerCanvas } from "@/components/viewer/ViewerCanvas";

type AppView = "playlist" | "viewer";

export default function Home() {
  const [view, setView] = useState<AppView>("playlist");

  // 永続化フックの初期化
  usePersistence();

  if (view === "viewer") {
    return <ViewerCanvas onBack={() => setView("playlist")} />;
  }

  return <PlaylistPanel onStartViewer={() => setView("viewer")} />;
}
