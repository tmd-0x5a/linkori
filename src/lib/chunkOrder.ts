/**
 * チャンク並び替えロジック（純粋関数）
 * PlaylistPanel の handleChunkDragEnd から抽出
 */

export type MoveResult =
  | { type: "group"; newOrder: string[] }
  | { type: "single"; fromIndex: number; toIndex: number }
  | { type: "noop" };

/**
 * ドラッグ完了時の新しいチャンク順序を計算する
 *
 * @param allIds     現在のチャンク ID 配列（順序通り）
 * @param activeId   ドラッグしたチャンクの ID
 * @param overId     ドロップ先チャンクの ID
 * @param selectedIds 選択済みチャンク ID の Set
 */
export function computeChunkMove(
  allIds: string[],
  activeId: string,
  overId: string,
  selectedIds: Set<string>
): MoveResult {
  if (activeId === overId) return { type: "noop" };

  // 複数選択中かつドラッグ対象が選択に含まれる → グループ移動
  if (selectedIds.size > 1 && selectedIds.has(activeId)) {
    // 選択済み ID を現在の順序で抽出
    const selectedInOrder = allIds.filter((id) => selectedIds.has(id));
    // 未選択 ID のみの配列
    const unselected = allIds.filter((id) => !selectedIds.has(id));

    if (selectedIds.has(overId)) {
      // over が選択グループ内 → グループ内での並び替え
      const fromIdx = selectedInOrder.indexOf(activeId);
      const toIdx   = selectedInOrder.indexOf(overId);
      const newSel  = [...selectedInOrder];
      const [moved] = newSel.splice(fromIdx, 1);
      newSel.splice(toIdx, 0, moved);
      // unselected への挿入位置: active 直後の unselected の手前
      const activeOrigIdx = allIds.indexOf(activeId);
      let insertPos = unselected.findIndex((id) => allIds.indexOf(id) > activeOrigIdx);
      if (insertPos === -1) insertPos = unselected.length;
      const result = [...unselected];
      result.splice(insertPos, 0, ...newSel);
      return { type: "group", newOrder: result };
    } else {
      // over が未選択 → その位置にまとめて挿入
      const activeOrigIdx = allIds.indexOf(activeId);
      const overOrigIdx   = allIds.indexOf(overId);
      const overPosInUnselected = unselected.indexOf(overId);
      // 下方向ドラッグなら over の後ろ、上方向なら前に挿入
      const insertPos = overOrigIdx > activeOrigIdx
        ? overPosInUnselected + 1
        : overPosInUnselected;
      const result = [...unselected];
      result.splice(insertPos, 0, ...selectedInOrder);
      return { type: "group", newOrder: result };
    }
  }

  // 単体移動
  const fromIndex = allIds.indexOf(activeId);
  const toIndex   = allIds.indexOf(overId);
  if (fromIndex === -1 || toIndex === -1) return { type: "noop" };
  return { type: "single", fromIndex, toIndex };
}
