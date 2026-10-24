"""ドロップの SVG（img/drops/*.svg）をつくるスクリプト

  python3 tools/make_drops.py

色を変えたいときは COLORS を書きかえて、もう一度実行する。
文字（L, M, …）は、保存データの画像名 /img/Lmaru.png の L と同じ。
"""
from pathlib import Path

# ドロップの色（もとの絵 img/*maru.png から取った色）
COLORS = {
    'L': '#68d2f9',  # 水色
    'M': '#7bdc6d',  # みどり
    'B': '#51adff',  # 青
    'A': '#dc6d95',  # あか
    'R': '#aa81cf',  # むらさき
    'K': '#d3df37',  # きみどり
    'P': '#daa2bc',  # ピンク
    'Y': '#fff322',  # 黄色
    'C': '#dcbce2',  # うすむらさき
    'O': '#ffd83a',  # オレンジ
    'S': '#a5a9b3',  # 銀
    'G': '#eaa200',  # 金（ノーミスのごほうび）
}


def mix(color, other, amount):
    """color と other を amount（0～1）の割合でまぜる"""
    a = [int(color[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * amount):02x}' for x, y in zip(a, b))


def drop_svg(color):
    light = mix(color, '#ffffff', 0.65)
    dark = mix(color, '#000000', 0.45)
    line = mix(color, '#ffffff', 0.85)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <!-- 左上から光が当たった、まるい飴玉 -->
    <radialGradient id="body" cx="36%" cy="30%" r="75%">
      <stop offset="0" stop-color="{light}"/>
      <stop offset="0.45" stop-color="{color}"/>
      <stop offset="1" stop-color="{dark}"/>
    </radialGradient>
    <!-- 光のつや -->
    <radialGradient id="shine" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <!-- 下のふちに映る、照り返し -->
    <linearGradient id="bounce" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="47" fill="url(#body)"/>
  <circle cx="50" cy="50" r="46.2" fill="none" stroke="{dark}" stroke-opacity="0.35" stroke-width="1.6"/>
  <!-- タマの顔（うすく浮き出たもよう） -->
  <g fill="none" stroke="{line}" stroke-opacity="0.75" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M27 67 C24 55 25 44 29 36 L28 22 L39 30 C46 28 54 28 61 30 L72 22 L71 36 C75 44 76 55 73 67 C66 75 34 75 27 67 Z"/>
    <circle cx="41" cy="50" r="4"/>
    <circle cx="59" cy="50" r="4"/>
    <path d="M24 56 L14 54 M24 61 L15 63 M76 56 L86 54 M76 61 L85 63"/>
  </g>
  <ellipse cx="50" cy="83" rx="27" ry="10" fill="url(#bounce)"/>
  <ellipse cx="33" cy="25" rx="17" ry="10" fill="url(#shine)" transform="rotate(-28 33 25)"/>
  <circle cx="72" cy="70" r="3" fill="#fff" fill-opacity="0.45"/>
</svg>
'''


if __name__ == '__main__':
    out = Path(__file__).resolve().parent.parent / 'img' / 'drops'
    out.mkdir(parents=True, exist_ok=True)
    for letter, color in COLORS.items():
        (out / f'{letter}.svg').write_text(drop_svg(color), encoding='utf-8')
    print(f'{len(COLORS)} 個のドロップを {out} につくりました')
