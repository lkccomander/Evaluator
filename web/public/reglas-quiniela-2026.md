# Reglas de la Quiniela Mundial 2026

## 📋 Resumen General

La Quiniela Mundial 2026 es un juego de predicciones donde los usuarios pronostcan los marcadores exactos de los 72 partidos de la **fase de grupos** del Mundial 2026. Los jugadores compiten en ligas y ganan puntos según la precisión de sus predicciones.

---

## 🎯 Objetivo

Acertar los marcadores de los partidos para acumular la mayor cantidad de puntos y escalar posiciones en la tabla de posiciones de tu liga y en el leaderboard global.

---

## ⏰ Fechas Importantes

| Evento | Fecha |
|--------|-------|
| **Inicio del torneo** | 11 de junio 2026 |
| **Fin de fase de grupos** | 28 de junio 2026 |
| **Total de partidos** | 72 partidos |
| **Zona horaria** | GMT-6 (Costa Rica) |

---

## 📝 Reglas de Puntuación

### Puntos por Partido

| Resultado | Puntos | Descripción |
|-----------|--------|-------------|
| **Marcador exacto** | **5 pts** | Acertar el marcador completo (ej: 2-1 → 2-1) |
| **Solo resultado correcto** | **3 pts** | Acertar ganador/empate pero no marcadores (ej: predice 3-0, final 2-0 → ambos gana local) |
| **Resultado incorrecto** | **0 pts** | No acertar el resultado |

### Definición de Resultado

- **Gana local**: Equipo de casa gana (ej: 2-1, 3-0, 1-0)
- **Empate**: Ambos equipos anotan lo mismo (ej: 1-1, 2-2, 0-0)
- **Gana visitante**: Equipo visitante gana (ej: 1-2, 0-3, 2-4)

---

## 🏆 Puntos de Gol (Desempate)

Los **puntos de gol** son el criterio de desempate cuando dos o más jugadores tienen los mismos puntos.

### Cómo se calculan:

| Caso | Puntos de Gol | Ejemplo |
|------|---------------|---------|
| **Marcador exacto (5 pts)** | Suma de goles del partido final, contando cada `0` acertado como `1` | Final 2-1 → 2+1 = **3 pts gol** |
| **Un score coincide (3 pts)** | Valor del score que coincidió (mínimo 1) | Predice 4-1, final 4-2 → **4 pts gol** |
| **Resultado correcto, ningún score coincide (3 pts)** | **0 pts gol** | Predice 1-1, final 3-3 → **0 pts gol** |
| **Resultado incorrecto (0 pts)** | **0 pts gol** | Predice 0-2, final 3-1 → **0 pts gol** |

### Ejemplos Completos

| Final | Predicción | Puntos | Puntos Gol | Razón |
|-------|------------|--------|------------|-------|
| 2-1 | 2-1 | **5** | **3** | Exacto: 2+1=3 goles |
| 2-0 | 2-0 | **5** | **3** | Exacto: 2 + 1 por acertar el 0 |
| 4-2 | 4-1 | **3** | **4** | Coincide home (4) |
| 3-0 | 1-0 | **3** | **1** | Coincide away (0) → mínimo 1 |
| 4-0 | 2-0 | **3** | **1** | Coincide away (0) → mínimo 1 |
| 0-0 | 1-1 | **3** | **0** | Empate correcto, ningún score coincide |
| 3-3 | 2-2 | **3** | **0** | Empate correcto, ningún score coincide |
| 2-2 | 2-2 | **5** | **4** | Exacto: 2+2=4 goles |
| 3-1 | 0-2 | **0** | **0** | Resultado incorrecto |

---

## 📅 Reglas de Envío

### Deadline (Fecha Límite)

- **15 minutos antes** del inicio de cada partido
- Las predicciones se **bloquean automáticamente** después del deadline
- El deadline se calcula en el **servidor** (no hay excepciones)

### Ejemplo:

```
Partido: México vs. Sudáfrica
Inicio: 7:00 PM GMT-6
Deadline: 6:45 PM GMT-6
```

### Edición de Predicciones

- ✅ Puedes **editar** tu predicción cuantas veces quieras **antes del deadline**
- ❌ No puedes editar después del deadline
- ✅ Puedes predecir cualquier partido futuro (no hay ventana de envío limitada)

---

## 🏟️ Ligas

### Requisitos

- **Todo usuario debe pertenecer a una liga** para enviar predicciones
- Las ligas son creadas exclusivamente por el **admin**
- Cada liga tiene un **código único** de 8 caracteres (ej: `X7K2-MN9P`)

### Unión a Ligas

**Opción A - En el registro:**
```
Usuario completa: username, email, password, player_team_name, league_code (opcional)
Si proporciona código válido → se une inmediatamente
```

**Opción B - Después del registro:**
```
Usuario ingresa código en el dashboard → POST /leagues/join
Si es válido y no tiene liga → se une
Si ya tiene liga → Error 409 "Already in a league"
```

### Reglas de Liga

- ❌ **No se puede cambiar de liga** una vez unido
- ✅ Todas las predicciones cuentan para el **leaderboard de la liga** y el **leaderboard global**
- ✅ El admin puede crear múltiples ligas

### Códigos de Liga

Los códigos se generan automáticamente excluyendo caracteres ambiguos:

```
Caracteres válidos: ABCDEFGHJKMNPQRSTUVWXYZ23456789
(Excluye: 0, O, 1, I, L)
```

**Ejemplos:** `X7K2-MN9P`, `ABCD-1234`, `WXYZ-9876`

---

## 📊 Tablas de Posiciones

### Leaderboard Global

- Incluye **todos los jugadores** de todas las ligas
- Público (cualquiera puede ver)
- Se actualiza automáticamente después de cada partido

### Leaderboard de Liga

- Solo muestra jugadores de **esa liga específica**
- Público (cualquiera puede ver)
- Se actualiza automáticamente

### Mi Posición

- Muestra tu posición global con vecinos ±5
- Muestra tu posición en tu liga
- Solo visible para usuarios autenticados

---

## 🥇 Criterios de Desempate

Cuando dos o más jugadores tienen los mismos puntos, se desempata en este orden:

1. **Total de puntos** (mayor a menor)
2. **Total de puntos de gol** (mayor a menor)
3. **Cantidad de partidos con puntos** (mayor a menor)
4. **Cantidad de hits exactos (5 pts)** (mayor a menor)

---

## 👤 Roles de Usuario

### Admin

- ✅ Crear ligas
- ✅ Ver todas las ligas y miembros
- ✅ Ingresar resultados de partidos
- ✅ El sistema calcula puntos automáticamente

### Jugador

- ✅ Unirse a una liga
- ✅ Enviar predicciones (si tiene liga)
- ✅ Editar predicciones (antes del deadline)
- ✅ Ver leaderboards
- ✅ Ver sus predicciones

---

## 🔐 Autenticación

### Registro

**Requisitos:**
- Username (único)
- Email (único)
- Password
- Player team name (nombre de tu equipo, único)
- League code (opcional, puede agregarse después)

### Login

- Email + password
- Recibe JWT access token (15 min) + refresh token (7 días)

### Token Refresh

- El cliente refresca automáticamente al recibir 401
- Refresh token válido por 7 días

---

## 📱 Interfaz de Usuario

### Diseño

- **Tema oscuro** (#0a0a0a)
- **Color de acento**: Dorado/Ámbar (#F59E0B)
- **Mobile-first**: Responsive, menús hamburguesa, targets de 44px
- **Banderas de países**: SVG locales (48 equipos)
