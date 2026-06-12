# Stock Market Ticker Display — Implementation Guide

Recreate the LED stock board aesthetic from the reference image: dark background, pixel/monospace font, red/green price data, scrolling ticker strip, and glowing digit effect.

---

## Visual Anatomy (from the reference)

| Element | Description |
|---|---|
| Background | Near-black `#0a0a0a` or `#111` — not pure black |
| Up prices | Bright green `#00e676` or `#39ff14` (neon green) |
| Down prices | Bright red `#ff1744` or `#ff3030` |
| Neutral / labels | White `#ffffff` or light gray `#cccccc` |
| Font | Monospace pixel font — `"Share Tech Mono"`, `"Courier New"`, or `"Digital-7"` |
| Glow effect | `text-shadow` with same color at low opacity to simulate LED bleed |
| Layout | Staggered rows of ticker symbols + prices, scrolling horizontally |

---

## CSS Foundation

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

:root {
  --bg:        #0a0a0a;
  --up:        #00e676;
  --down:      #ff1744;
  --neutral:   #ffffff;
  --dim:       #888888;
  --glow-up:   0 0 8px #00e676aa, 0 0 16px #00e67644;
  --glow-down: 0 0 8px #ff1744aa, 0 0 16px #ff174444;
  --font:      'Share Tech Mono', 'Courier New', monospace;
}

body {
  background: var(--bg);
  color: var(--neutral);
  font-family: var(--font);
  margin: 0;
}

.tick-up   { color: var(--up);   text-shadow: var(--glow-up); }
.tick-down { color: var(--down); text-shadow: var(--glow-down); }
.tick-flat { color: var(--neutral); }
```

---

## Scrolling Ticker Strip

```html
<div class="ticker-wrap">
  <div class="ticker-track">
    <!-- items repeat twice for seamless loop -->
    <span class="tick-item tick-up">BTC $104,200 +2.4%</span>
    <span class="tick-item tick-down">ETH $3,812 -1.1%</span>
    <span class="tick-item tick-up">NVDA $138.50 +0.8%</span>
    <!-- ... more items ... -->
    <!-- duplicate set starts here -->
    <span class="tick-item tick-up">BTC $104,200 +2.4%</span>
    <!-- ... -->
  </div>
</div>
```

```css
.ticker-wrap {
  overflow: hidden;
  width: 100%;
  background: #0d0d0d;
  border-top: 1px solid #222;
  border-bottom: 1px solid #222;
  padding: 10px 0;
}

.ticker-track {
  display: flex;
  gap: 48px;
  white-space: nowrap;
  /* total width must be >= 2x content so loop is seamless */
  animation: scroll-ticker 30s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused;
}

.tick-item {
  font-size: 1rem;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}

@keyframes scroll-ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

**Key:** duplicate the list of items so `translateX(-50%)` lands exactly at the start — creating a seamless infinite scroll.

---

## Full Board (grid of prices, like the image)

```html
<div class="board">
  <div class="board-cell tick-up">
    <span class="symbol">BJK</span>
    <span class="price">$4.03</span>
    <span class="change">+0.34</span>
  </div>
  <div class="board-cell tick-down">
    <span class="symbol">MEL</span>
    <span class="price">$6.12</span>
    <span class="change">-0.22</span>
  </div>
  <!-- more cells -->
</div>
```

```css
.board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 24px;
}

.board-cell {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  border: 1px solid #1a1a1a;
  border-radius: 4px;
  background: #111;
}

.board-cell .symbol {
  font-size: 0.75rem;
  color: var(--dim);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.board-cell .price {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 4px 0;
}

.board-cell .change {
  font-size: 0.85rem;
}

/* Inherited color + glow from .tick-up / .tick-down */
.board-cell.tick-up  .price,
.board-cell.tick-up  .change { color: var(--up);   text-shadow: var(--glow-up); }

.board-cell.tick-down .price,
.board-cell.tick-down .change { color: var(--down); text-shadow: var(--glow-down); }
```

---

## Pixel / Chunky Number Effect (optional — matches the blocky LED look)

The image uses large, pixelated numerals. Two approaches:

**Option A — CSS filter (easy):**
```css
.price {
  image-rendering: pixelated;
  filter: blur(0px) contrast(1.1);
  font-size: 2.5rem;
  letter-spacing: -0.02em;
}
```

**Option B — Google Font `VT323` (authentic CRT/LED feel):**
```css
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

.price {
  font-family: 'VT323', monospace;
  font-size: 3rem;
}
```

---

## Live Price Update Animation

When a price changes, flash the cell to signal the update:

```css
@keyframes flash-up {
  0%   { background: #00e67622; }
  100% { background: transparent; }
}

@keyframes flash-down {
  0%   { background: #ff174422; }
  100% { background: transparent; }
}

.board-cell.updated-up   { animation: flash-up   0.6s ease-out; }
.board-cell.updated-down { animation: flash-down 0.6s ease-out; }
```

```js
// Apply flash class on update, then remove
function updatePrice(cell, newPrice, oldPrice) {
  const cls = newPrice > oldPrice ? 'updated-up' : 'updated-down';
  cell.classList.remove('updated-up', 'updated-down');
  void cell.offsetWidth; // force reflow to restart animation
  cell.classList.add(cls);
  cell.querySelector('.price').textContent = '$' + newPrice.toFixed(2);
}
```

---

## Background Ambient Effect (optional depth)

Mimics the out-of-focus ticker rows visible in the background of the image:

```css
.ambient-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  opacity: 0.07;
  pointer-events: none;
  font-family: var(--font);
  font-size: 2rem;
  color: #00e676;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  filter: blur(1px);
}
```

Fill it with static repeated ticker text — it blurs into background noise exactly like the image.

---

## React Component Skeleton

```jsx
import { useState, useEffect } from "react";

const tickers = [
  { symbol: "BTC",  price: 104200, change: +2.4 },
  { symbol: "ETH",  price: 3812,   change: -1.1 },
  { symbol: "NVDA", price: 138.50, change: +0.8 },
];

function TickerBoard() {
  const [data, setData] = useState(tickers);

  // Simulate live updates
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => prev.map(t => ({
        ...t,
        price:  +(t.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2),
        change: +(t.change + (Math.random() - 0.5) * 0.1).toFixed(2),
      })));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="board">
      {data.map(t => (
        <div key={t.symbol} className={`board-cell ${t.change >= 0 ? "tick-up" : "tick-down"}`}>
          <span className="symbol">{t.symbol}</span>
          <span className="price">${t.price.toLocaleString()}</span>
          <span className="change">{t.change >= 0 ? "+" : ""}{t.change}%</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Font Recommendations (priority order)

| Font | Feel | Import |
|---|---|---|
| `VT323` | Authentic LED/pixel | Google Fonts |
| `Share Tech Mono` | Clean digital | Google Fonts |
| `Orbitron` | Sci-fi / futuristic | Google Fonts |
| `Digital-7` | Classic 7-segment display | dafont / self-host |
| `Courier New` | Fallback monospace | System |

---

## Checklist

- [ ] Dark background (`#0a0a0a` — not pure black, adds depth)
- [ ] Red/green color split with glow `text-shadow`
- [ ] Monospace / pixel font (VT323 or Share Tech Mono)
- [ ] Scrolling strip with seamless CSS `translateX(-50%)` loop
- [ ] Flash animation on price change
- [ ] `animation-play-state: paused` on hover for readability
- [ ] Respect `prefers-reduced-motion` — disable scroll animation if needed
- [ ] Responsive: stack board cells on mobile
