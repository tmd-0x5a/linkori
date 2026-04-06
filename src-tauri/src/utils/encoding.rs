/// Unicode コードポイントを CP437 バイト値に逆変換する。
/// zip crate は UTF-8 フラグなしエントリを CP437 としてデコードするため、
/// 逆変換で元の Shift-JIS バイト列を復元するために使う。
fn unicode_to_cp437(c: char) -> Option<u8> {
    let cp = c as u32;
    if cp < 0x80 {
        return Some(cp as u8);
    }
    // CP437 の 0x80-0xFF に対応するマッピング
    match cp {
        0x00c7 => Some(0x80), 0x00fc => Some(0x81), 0x00e9 => Some(0x82), 0x00e2 => Some(0x83),
        0x00e4 => Some(0x84), 0x00e0 => Some(0x85), 0x00e5 => Some(0x86), 0x00e7 => Some(0x87),
        0x00ea => Some(0x88), 0x00eb => Some(0x89), 0x00e8 => Some(0x8a), 0x00ef => Some(0x8b),
        0x00ee => Some(0x8c), 0x00ec => Some(0x8d), 0x00c4 => Some(0x8e), 0x00c5 => Some(0x8f),
        0x00c9 => Some(0x90), 0x00e6 => Some(0x91), 0x00c6 => Some(0x92), 0x00f4 => Some(0x93),
        0x00f6 => Some(0x94), 0x00f2 => Some(0x95), 0x00fb => Some(0x96), 0x00f9 => Some(0x97),
        0x00ff => Some(0x98), 0x00d6 => Some(0x99), 0x00dc => Some(0x9a), 0x00a2 => Some(0x9b),
        0x00a3 => Some(0x9c), 0x00a5 => Some(0x9d), 0x20a7 => Some(0x9e), 0x0192 => Some(0x9f),
        0x00e1 => Some(0xa0), 0x00ed => Some(0xa1), 0x00f3 => Some(0xa2), 0x00fa => Some(0xa3),
        0x00f1 => Some(0xa4), 0x00d1 => Some(0xa5), 0x00aa => Some(0xa6), 0x00ba => Some(0xa7),
        0x00bf => Some(0xa8), 0x2310 => Some(0xa9), 0x00ac => Some(0xaa), 0x00bd => Some(0xab),
        0x00bc => Some(0xac), 0x00a1 => Some(0xad), 0x00ab => Some(0xae), 0x00bb => Some(0xaf),
        0x2591 => Some(0xb0), 0x2592 => Some(0xb1), 0x2593 => Some(0xb2), 0x2502 => Some(0xb3),
        0x2524 => Some(0xb4), 0x2561 => Some(0xb5), 0x2562 => Some(0xb6), 0x2556 => Some(0xb7),
        0x2555 => Some(0xb8), 0x2563 => Some(0xb9), 0x2551 => Some(0xba), 0x2557 => Some(0xbb),
        0x255d => Some(0xbc), 0x255c => Some(0xbd), 0x255b => Some(0xbe), 0x2510 => Some(0xbf),
        0x2514 => Some(0xc0), 0x2534 => Some(0xc1), 0x252c => Some(0xc2), 0x251c => Some(0xc3),
        0x2500 => Some(0xc4), 0x253c => Some(0xc5), 0x255e => Some(0xc6), 0x255f => Some(0xc7),
        0x255a => Some(0xc8), 0x2554 => Some(0xc9), 0x2569 => Some(0xca), 0x2566 => Some(0xcb),
        0x2560 => Some(0xcc), 0x2550 => Some(0xcd), 0x256c => Some(0xce), 0x2567 => Some(0xcf),
        0x2568 => Some(0xd0), 0x2564 => Some(0xd1), 0x2565 => Some(0xd2), 0x2559 => Some(0xd3),
        0x2558 => Some(0xd4), 0x2552 => Some(0xd5), 0x2553 => Some(0xd6), 0x256b => Some(0xd7),
        0x256a => Some(0xd8), 0x2518 => Some(0xd9), 0x250c => Some(0xda), 0x2588 => Some(0xdb),
        0x2584 => Some(0xdc), 0x258c => Some(0xdd), 0x2590 => Some(0xde), 0x2580 => Some(0xdf),
        0x03b1 => Some(0xe0), 0x00df => Some(0xe1), 0x0393 => Some(0xe2), 0x03c0 => Some(0xe3),
        0x03a3 => Some(0xe4), 0x03c3 => Some(0xe5), 0x00b5 => Some(0xe6), 0x03c4 => Some(0xe7),
        0x03a6 => Some(0xe8), 0x0398 => Some(0xe9), 0x03a9 => Some(0xea), 0x03b4 => Some(0xeb),
        0x221e => Some(0xec), 0x03c6 => Some(0xed), 0x03b5 => Some(0xee), 0x2229 => Some(0xef),
        0x2261 => Some(0xf0), 0x00b1 => Some(0xf1), 0x2265 => Some(0xf2), 0x2264 => Some(0xf3),
        0x2320 => Some(0xf4), 0x2321 => Some(0xf5), 0x00f7 => Some(0xf6), 0x2248 => Some(0xf7),
        0x00b0 => Some(0xf8), 0x2219 => Some(0xf9), 0x00b7 => Some(0xfa), 0x221a => Some(0xfb),
        0x207f => Some(0xfc), 0x00b2 => Some(0xfd), 0x25a0 => Some(0xfe), 0x00a0 => Some(0xff),
        _ => None,
    }
}

/// CP437 デコード済み文字列を元のバイト列に逆変換する。
/// すべての文字が CP437 範囲内でない場合は None を返す。
fn reverse_cp437_str(s: &str) -> Option<Vec<u8>> {
    s.chars().map(unicode_to_cp437).collect()
}

/// 文字が日本語（ひらがな・カタカナ・漢字）かどうかを判定する。
fn is_japanese_char(c: char) -> bool {
    let cp = c as u32;
    matches!(cp,
        0x3000..=0x9FFF |  // CJK統合漢字・ひらがな・カタカナ・記号
        0xF900..=0xFAFF |  // CJK互換漢字
        0xFF00..=0xFFEF    // 全角・半角カタカナなど
    )
}

/// ZIP エントリ名の1セグメント（パス区切り `/` を含まない）をデコードする。
///
/// zip crate は UTF-8 フラグなしエントリを CP437 としてデコードするため、
/// name_raw() が CP437 デコード後の UTF-8 バイト列を返す場合に対応する。
/// 優先順位：
/// 1. UTF-8 有効 → 日本語文字を含む → そのまま採用
/// 2. UTF-8 有効 → 日本語なし → CP437 逆変換 → Shift-JIS 試行（日本語が出れば採用）
/// 3. UTF-8 無効 → Shift-JIS 試行
/// 4. すべて失敗 → UTF-8 lossy
pub fn decode_zip_name(raw: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(raw) {
        // UTF-8 として有効
        // すでに日本語文字が含まれるなら正規の UTF-8 → そのまま返す
        if s.chars().any(is_japanese_char) {
            return s.to_string();
        }
        // 非 ASCII 文字を含む場合 → CP437 → Shift-JIS の逆変換を試みる
        if s.chars().any(|c| c > '\x7F') {
            if let Some(original_bytes) = reverse_cp437_str(s) {
                let (cow, _, had_errors) = encoding_rs::SHIFT_JIS.decode(&original_bytes);
                if !had_errors && cow.chars().any(is_japanese_char) {
                    return cow.into_owned();
                }
            }
        }
        return s.to_string();
    }
    // UTF-8 として無効 → Shift-JIS を試す
    let (cow, _, had_errors) = encoding_rs::SHIFT_JIS.decode(raw);
    if !had_errors {
        return cow.into_owned();
    }
    String::from_utf8_lossy(raw).into_owned()
}

/// ZIP エントリのフルパス（`/` 区切り）を正しくデコードする。
/// 各パスセグメントを個別に `decode_zip_name` でデコードし、`/` で再結合する。
/// `/` (0x2F) は UTF-8・Shift-JIS 共通の ASCII 文字なのでバイト分割が安全。
pub fn decode_zip_path(raw: &[u8]) -> String {
    raw.split(|&b| b == b'/')
        .map(|seg| decode_zip_name(seg))
        .collect::<Vec<_>>()
        .join("/")
}
