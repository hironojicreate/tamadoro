"""数字・記号・ひらがな（js/glyphs.js）をつくるスクリプト

  python3 tools/make_glyphs.py

タマドロのために一から描いた字形です。教科書体の「書き方のきまり」
（1 はまっすぐ1本、4 はななめとたてが上ではなれる、8 は右上から一筆で、など）に
合わせて、線の通り道（中心線）を決め、同じ太さの丸い線で描きます。
フォントの形をなぞったものではありません。

viewBox は 0 0 100 130（たて 10～120 が字の高さ）。

★ あとで最終調整する（覚え書き）
  - は：結びをもう少し横に広く・平たく、さいごのぬけをもう少し横向きに（元の字に寄せるか見る）
  - 6：書きはじめの線を、もう少し弧をえがいて下りるように
  - 2：ななめの線の少しのふくらみと、下の横線の長さ
  - 8：書きはじめの飛び出しの長さ
  - と：全体の形（まだ細かく見ていない）
  - 線の太さ（数字 10.5・ひらがな 9.5）。元の画像カードより少し細い
  - 実際の画面（式・テンキー・？カード）の大きさで見て、全体の大きさ・太さをそろえる
"""
import json
import math
import re
from pathlib import Path

STROKE = 10.5        # 線の太さ
KANA_STROKE = 9.5    # ひらがなは小さく縮めるので、少し細く


# ---------- 8：下のまるから、自然に直線へつながるように計算でつくる ----------
#   下のまるは だ円の一部。右上の書きはじめ E へ向かう直線が、だ円にちょうど接する点から出る

def make_eight():
    cx, cy, rx, ry = 50, 94, 28, 26      # 下のまる（だ円）
    end = (74, 24)                       # 直線のおわり（書きはじめの線の上。書きはじめが少し飛び出る）
    entry = math.radians(-58)            # 上から入ってくる所（だ円の右上）

    def point(t):
        return (cx + rx * math.cos(t), cy + ry * math.sin(t))

    def tangent(t):
        return (-rx * math.sin(t), ry * math.cos(t))

    # だ円の左上で、そこから end への向きが、だ円の向きと同じになる点
    best = None
    for i in range(1000):
        t = math.radians(180 + i * 0.09)
        p, d = point(t), tangent(t)
        ex, ey = end[0] - p[0], end[1] - p[1]
        if d[0] * ex + d[1] * ey > 0:
            cross = abs(d[0] * ey - d[1] * ex)
            if best is None or cross < best[0]:
                best = (cross, t)
    leave = best[1]

    def arc(t0, t1, n):
        out = []
        step = (t1 - t0) / n
        k = 4 / 3 * math.tan(step / 4)
        for i in range(n):
            a, b = t0 + i * step, t0 + (i + 1) * step
            p0, p1, d0, d1 = point(a), point(b), tangent(a), tangent(b)
            c1 = (p0[0] + k * d0[0], p0[1] + k * d0[1])
            c2 = (p1[0] - k * d1[0], p1[1] - k * d1[1])
            out.append('C%g %g %g %g %g %g' % tuple(round(v, 1) for v in (*c1, *c2, *p1)))
        return ' '.join(out)

    p_entry, t_entry = point(entry), tangent(entry)
    length = math.hypot(*t_entry)
    upper = 'M76 28 C70 15 60 10 50 10 C36 10 26 19 26 32'
    # 上のまるの左はし (26,32) から、下のまるの入り口まで、1本のなめらかなカーブで
    # （はじめは真下へ、おわりは だ円と同じ向きで入る → 折れもゆがみもない）
    to_entry = 'C%g %g %g %g %g %g' % tuple(round(v, 1) for v in (
        26, 32 + 20,
        p_entry[0] - t_entry[0] / length * 18, p_entry[1] - t_entry[1] / length * 18,
        *p_entry))
    return ' '.join([upper, to_entry, arc(entry, leave, 4), 'L%g %g' % end])


# ---------- 線の通り道 ----------

BASE = {
    '0': 'M50 10 C29 10 18 34 18 65 C18 96 29 120 50 120 C71 120 82 96 82 65 C82 34 71 10 50 10 Z',
    # 1：まっすぐ1本
    '1': 'M50 10 V120',
    # 2：カーブから、ななめの直線へ、折れずに入る（カーブのおわりの向き＝直線の向き）
    '2': 'M20 38 C21 20 34 10 50 10 C67 10 80 21 80 38 C80 55 66.9 65.3 56 77 L18 118 H84',
    '3': 'M22 22 C30 14 40 10 50 10 C66 10 77 20 77 34 C77 50 64 59 46 59 C66 59 81 70 81 88 '
         'C81 107 67 120 49 120 C36 120 25 114 19 104',
    # 4：ななめの線と、たての線は、上ではなれている
    '4': 'M54 12 L15 86 H88 M68 30 V120',
    # 5：1画目（たて → まる）の折れるところを低めに。さいごの丸みは、左に行きすぎない
    '5': 'M76 12 H34 L29 64 C37 57 45 54 53 54 C70 54 81 66 81 85 C81 105 68 120 50 120 C40 120 32 116 27 110',
    # 6：まんなかの上から書きはじめる
    '6': 'M56 10 C42 26 26 52 24 84 C23 105 36 120 52 120 C69 120 80 106 80 88 C80 70 68 58 52 58 C40 58 30 64 25 73',
    # 7：1画目の、左のたての部分を長めに
    '7': 'M18 36 V14 H82 L46 120',
    # 8：右上から書きはじめ、くるん、くるんと回ったら、ななめ上へまっすぐ進んで、
    #    書きはじめの線にくっつく（書きはじめが少し飛び出る）
    '8': make_eight(),
    # 9：まる（まん丸ではなく、少しつぶれた形）をかいて、右上までもどってから折り返し、下のまんなかへまっすぐ
    #    （書きはじめと、まるのおわりは、折り返しの直線の上。まるが直線の外に出ない）
    '9': 'M76 28.6 C72 15 63 9 52 9 C35 9 21 20 21 37 C21 54 34 63 49 63 C61 63 69.5 56 71.6 44 L79 18 L50 120',
    '+': 'M14 67 H86 M50 31 V103',
    '−': 'M14 67 H86',
    '×': 'M22 39 L78 95 M78 39 L22 95',
    '=': 'M14 50 H86 M14 84 H86',
    '?': 'M24 37 C24 20 36 10 51 10 C67 10 78 21 78 36 C78 52 63 58 55 66 C51 70 50 76 50 86 M50 111 L50 112',
    # は：1画目は下までのばして、はねる（結びとはなす）。2画目の横棒は長め。
    #     3画目は下りてから、下→左→上→右とくるんと回り、たて線と交わって（結び）そのまま右下へ。
    #     結びととめは、横棒の長さにおさめる
    'は': 'M22 22 C17 52 17 86 23 114 L29 105 M46 50 H98 '
          'M76 22 V104 C76 112 72 117 64 117 C54 117 49 110 49 103 C49 96 55 91 63 91 C72 91 80 94 86 100 '
          'C90 104 94 110 98 116',
    # と：2画目の曲がるところを、少し下に
    'と': 'M38 22 C43 34 47 44 52 55 M74 46 C58 56 39 72 36 90 C34 108 54 115 82 110',
}

# 横はばの調整（中心 50 から何倍にするか）
WIDTH = {'0': 1.22, '1': 1.0}
DIGIT_WIDTH = 1.06          # 2～9

# ひらがなは数字より小さく、下のほう（たて 42～122）に置く
KANA = {'は', 'と'}


def scale_path(d, kx, ky=1.0, top=10):
    """横は中心(50)から kx 倍、たては top を基準に ky 倍する"""
    res, cmd, idx = [], None, 0
    for t in re.findall(r'[MLCHVZ]|-?\d+(?:\.\d+)?', d):
        if t in 'MLCHVZ':
            cmd, idx = t, 0
            res.append(t)
            continue
        v = float(t)
        if cmd == 'H' or (cmd in 'MLC' and idx % 2 == 0):
            v = 50 + (v - 50) * kx
        else:
            v = top + (v - 10) * ky
        res.append('%g' % round(v, 1))
        idx += 1
    return ' '.join(res)


def build():
    glyphs = {}
    for ch, d in BASE.items():
        if ch in KANA:
            glyphs[ch] = {'d': scale_path(d, 0.8, 0.73, 42), 'w': KANA_STROKE}
        else:
            kx = WIDTH.get(ch, DIGIT_WIDTH if ch.isdigit() else 1.0)
            glyphs[ch] = {'d': scale_path(d, kx), 'w': STROKE}
    return glyphs


if __name__ == '__main__':
    out = Path(__file__).resolve().parent.parent / 'js' / 'glyphs.js'
    body = json.dumps(build(), ensure_ascii=False, indent=4)
    out.write_text(f'''// 数字・記号・ひらがなの字形（タマドロのために一から描いたもの）
// ★ このファイルは tools/make_glyphs.py でつくる。形を直すときは、そちらを直して実行する
//   d: 線の通り道（viewBox 0 0 100 130）、w: 線の太さ

const GLYPHS = {body};

// 1文字を、インラインの SVG にする（色は CSS の color、大きさは CSS で決める）
function glyphSVG(char) {{
    const glyph = GLYPHS[char];
    if (!glyph) {{
        return '';
    }}
    return `<svg class="glyph" viewBox="0 0 100 130" aria-hidden="true" focusable="false">`
        + `<path d="${{glyph.d}}" stroke-width="${{glyph.w}}"/></svg>`;
}}
''', encoding='utf-8')
    print(f'{len(BASE)} 文字を {out} につくりました')
