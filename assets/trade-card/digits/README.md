# Trade card digits (0–9)

One PNG per digit (`0.png` … `9.png`). The **same files** are used for **wins (top)** and **losses (bottom)** — the bot places them in two different spots on the card.

You do **not** need a second set of digits for losses unless the bottom numbers use a completely different visual style.

Transparent backgrounds work best.

**Important:** Export digits cropped tight to the number, not full 1600×900 canvases. The bot auto-trims padding, but tight exports look best.

If only some digits exist (e.g. testing `9.png`), values like `5` use the built-in font until you add `5.png`.
