# LED Pixel Ticker Board — Implementation Guide

Replica del efecto del display LED de mercado bursátil: fondo negro, fuente pixelada VT323, colores rojo/verde con glow, cuadrículas de precios, overlay de scanlines, y ticker scrolling infinito.

---

## Stack de fuentes

```html
<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
```

`VT323` es la fuente clave — es un bitmap font que replica exactamente los displays LED de 7 segmentos de la imagen. Sin ella el efecto no funciona.

---

## Variables de color y glow

```css
:root {
  --bg:       #080808;   /* casi negro, no puro negro */
  --up:       #00e030;   /* verde LED */
  --down:     #ff2020;   /* rojo LED */
  --neu:      #ffffff;

  --glow-up:   0 0 4px #00e03088, 0 0 1px #00e030;
  --glow-down: 0 0 4px #ff202088, 0 0 1px #ff2020;
  --glow-neu:  0 0 4px #ffffff55;
}

.up  { color: var(--up);   background: #001800; text-shadow: var(--glow-up); }
.dn  { color: var(--down); background: #180000; text-shadow: var(--glow-down); }
.neu { color: var(--neu);  background: #101010; text-shadow: var(--glow-neu); }
```

El fondo de cada celda tiene un tinte del mismo color (verde oscurísimo / rojo oscurísimo) para replicar el "halo" que se ve en los displays LED reales.

---

## Grid de celdas (el efecto cuadrícula)

```html
<div class="board-wrap">
  <div class="grid">
    <div class="cell up">
      <div class="pixel-overlay"></div>
      <span class="sym">BJK</span>
      <span class="price">$4.03</span>
      <span class="chg">+0.34</span>
    </div>
    <div class="cell dn">
      <div class="pixel-overlay"></div>
      <span class="sym">MEL</span>
      <span class="price">$6.12</span>
      <span class="chg">-0.22</span>
    </div>
    <!-- más celdas -->
  </div>
</div>
```

```css
.board-wrap {
  background: #080808;
  padding: 20px;
  border-radius: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;   /* el gap pequeño crea la separación de "módulos" */
}

.cell {
  font-family: 'VT323', monospace;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  position: relative;
}

.cell .sym   { font-size: 15px; letter-spacing: 3px; opacity: 0.7; }
.cell .price { font-size: 30px; }
.cell .chg   { font-size: 17px; }
```

---

## Efecto Scanlines / Pixel Overlay

Este overlay es lo que hace que el texto se vea "pixelado" en bloques como en la foto — son líneas horizontales translúcidas que simulan el espacio entre filas de LEDs:

```css
.pixel-overlay {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.15) 3px,
    rgba(0, 0, 0, 0.15) 4px
  );
  pointer-events: none;
}
```

Ajustar los valores `3px / 4px` controla el "tamaño del pixel":
- `2px / 3px` → pixels más densos, más parecido a pantalla LED pequeña
- `4px / 5px` → pixels más grandes y evidentes

---

## Texto central grande (MARKET REPORT)

```css
.big-label {
  font-family: 'VT323', monospace;
  font-size: 72px;
  text-align: center;
  letter-spacing: 6px;
  color: #fff;
  text-shadow: 0 0 2px #fff, 0 0 6px #ffffff88;
  line-height: 1;
  margin: 16px 0;
}
```

```html
<div class="big-label">MARKET<br>REPORT</div>
```

---

## Ticker Scrolling Infinito

**El truco:** duplicar los items y hacer `translateX(-50%)` — cuando termina el primer set ya está exactamente en el inicio del segundo, creando el loop perfecto sin glitch.

```html
<div class="ticker-wrap">
  <div class="ticker-track" id="ticker">
    <!-- items se duplican via JS o HTML -->
    <span class="t-item up">BJK $4.03 +0.34</span>
    <span class="t-item dn">MEL $6.12 -0.22</span>
    <!-- ... más items ... -->
    <!-- DUPLICADO -->
    <span class="t-item up">BJK $4.03 +0.34</span>
    <!-- ... -->
  </div>
</div>
```

```css
.ticker-wrap {
  overflow: hidden;
  border-top: 1px solid #1a1a1a;
  padding: 8px 0;
}

.ticker-track {
  display: flex;
  gap: 40px;
  white-space: nowrap;
  width: max-content;
  animation: scroll 28s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused; /* pausa al hacer hover */
}

.t-item {
  font-family: 'VT323', monospace;
  font-size: 20px;
  letter-spacing: 2px;
  flex-shrink: 0;
}

@keyframes scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

---

## Flash al actualizar precio (JS)

```css
.flash {
  animation: fl 0.5s ease-out;
}

@keyframes fl {
  0%   { filter: brightness(2.5); }
  100% { filter: brightness(1); }
}
```

```js
function updatePrice(cellEl, newClass) {
  cellEl.className = 'cell ' + newClass;
  // forzar reflow para reiniciar la animación
  void cellEl.offsetWidth;
  cellEl.classList.add('flash');
  setTimeout(() => cellEl.classList.remove('flash'), 500);
}
```

---

## Polling de precios reales (integración con API)

```js
// Para la quiniela: polling de worldcup26.ir
// Para trading: polling de cualquier price feed

async function pollPrices() {
  const res  = await fetch('https://tu-api.com/prices');
  const data = await res.json();

  data.forEach(item => {
    const cell = document.getElementById('cell-' + item.id);
    if (!cell) return;

    const oldPrice = parseFloat(cell.dataset.price);
    const newPrice = item.price;
    const isUp     = newPrice >= oldPrice;

    cell.dataset.price = newPrice;
    cell.querySelector('.price').textContent = '$' + newPrice.toFixed(2);
    cell.querySelector('.chg').textContent   = (isUp ? '+' : '') + item.change.toFixed(2);

    updatePrice(cell, isUp ? 'up' : 'dn');
  });
}

setInterval(pollPrices, 2000); // polling cada 2s
```

---

## Tamaños de fuente recomendados (VT323)

| Elemento | Tamaño | Uso |
|---|---|---|
| Símbolo (ticker) | 13–16px | Label pequeño arriba |
| Precio | 28–34px | Número principal |
| Cambio (+/-) | 16–20px | Línea inferior |
| Texto central grande | 60–80px | MARKET REPORT / título |
| Strip de ticker | 18–22px | Scrolling inferior |

`VT323` tiene espacio entre caracteres muy compacto — usar `letter-spacing: 2px` a `6px` abre el texto y da más legibilidad.

---

## Checklist de implementación

- [ ] Importar fuente `VT323` de Google Fonts
- [ ] Background `#080808` (no negro puro)
- [ ] `gap: 3px` entre celdas del grid (simula separación de módulos LED)
- [ ] `pixel-overlay` con `repeating-linear-gradient` en cada celda
- [ ] `text-shadow` con el color del texto a baja opacidad (efecto glow)
- [ ] Fondo de celda con tinte de color (`#001800` / `#180000`)
- [ ] Ticker duplicado para loop sin glitch con `translateX(-50%)`
- [ ] `animation-play-state: paused` en hover del ticker
- [ ] Flash `brightness()` al actualizar precios
- [ ] `letter-spacing` generoso en todos los textos
- [ ] Responsive: en móvil reducir grid a `repeat(2, 1fr)` y font-size en ~20%
