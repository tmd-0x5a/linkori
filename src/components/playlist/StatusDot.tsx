import { cn } from "@/lib/cn";

// プレイリスト行の既読/未読ステータス表示用ドット
export function StatusDot({ status }: { status?: "unread" | "read" }) {
  if (!status) return <span className="size-2 shrink-0" />;
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        status === "unread" ? "bg-[#60a5fa]" : "bg-[#9fd8e8]"
      )}
    />
  );
}
