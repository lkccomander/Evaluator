# worldcup26.ir — FIFA World Cup 2026 API

Base URL: `https://worldcup26.ir`  
Swagger docs: `https://worldcup26.ir/api-docs/`  
Sin costo · Open source · 104 partidos · 48 equipos · 12 grupos · 16 estadios

---

## Autenticación

Todos los endpoints (excepto `/health` y auth) requieren JWT en el header:

```
Authorization: Bearer <token>
```

Los tokens tienen vigencia de **84 días**.

### Registrar usuario

```
POST /auth/register
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

Respuesta exitosa `200`:
```json
{
  "user": { "_id": "...", "name": "...", "email": "..." },
  "token": "eyJ..."
}
```

Errores: `400` usuario ya existe / fallo de registro.

### Login

```
POST /auth/authenticate
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

Respuesta exitosa `200`: igual que registro (incluye `token`).  
Errores: `400` usuario no encontrado / contraseña inválida.

---

## Endpoints de Datos

> Todos requieren `Authorization: Bearer <token>` salvo que se indique lo contrario.

### Health Check (sin auth)

```
GET /health
GET /api/health
```

Respuesta:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-11T...",
  "uptime": 3600,
  "version": "1.0.5",
  "environment": "production",
  "database": { "status": "connected", "name": "worldcup2026" },
  "memory": { "used": "45 MB", "total": "128 MB" }
}
```

---

### Equipos

| Endpoint | Descripción |
|---|---|
| `GET /get/teams` | Todos los 48 equipos |
| `GET /get/team/:id` | Equipo por ID |
| `GET /get/team/?name=Argentina` | Equipo por nombre (EN o FA) |
| `GET /get/teams/?group=J` | Equipos de un grupo (A–L) |

Ejemplo de objeto equipo:
```json
{
  "id": "37",
  "name_en": "Argentina",
  "name_fa": "آرژانتین",
  "fifa_code": "ARG",
  "groups": "J",
  "flag": "https://..."
}
```

---

### Grupos y Standings

| Endpoint | Descripción |
|---|---|
| `GET /get/groups` | Todos los 12 grupos con standings |
| `GET /get/group/:id` | Grupo por ID |
| `GET /get/group/?name=A` | Grupo por letra (A–L) |

Ejemplo de objeto grupo:
```json
{
  "group": "G",
  "teams": [
    { "team_id": "25", "pts": "0", "gf": "0", "ga": "0" },
    { "team_id": "26", "pts": "0", "gf": "0", "ga": "0" }
  ]
}
```

Los standings se actualizan automáticamente al terminar cada partido.

---

### Partidos

| Endpoint | Descripción |
|---|---|
| `GET /get/games` | Todos los 104 partidos |
| `GET /get/game/:id` | Partido por ID |

Ejemplo de objeto partido:
```json
{
  "id": "1",
  "home_team_id": "1",
  "away_team_id": "2",
  "home_score": 0,
  "away_score": 0,
  "group": "A",
  "matchday": "1",
  "local_date": "June 11, 2026",
  "stadium_id": "1",
  "finished": false,
  "type": "group"
}
```

**Campos clave:**
- `finished: boolean` — si el partido terminó
- `type` — `"group"`, `"round_of_32"`, `"quarter"`, `"semi"`, `"final"`
- `home_score` / `away_score` — se actualizan en tiempo real durante el torneo

---

### Estadios

```
GET /get/stadiums
```

Ejemplo:
```json
{
  "id": "11",
  "name_en": "MetLife Stadium",
  "fifa_name": "New York/New Jersey Stadium",
  "city_en": "East Rutherford, NJ",
  "country_en": "United States",
  "capacity": 82500
}
```

---

## Códigos de Respuesta

| Código | Significado |
|---|---|
| `200` | OK |
| `400` | Bad Request — parámetros inválidos |
| `401` | Unauthorized — token JWT inválido o ausente |
| `404` | Recurso no encontrado |
| `429` | Rate limit excedido |
| `500` | Error interno del servidor |

---

## Grupos del Torneo (referencia rápida)

| Grupo | Equipos |
|---|---|
| A | México, Sudáfrica, Corea del Sur, TBD |
| B | Canadá, Suiza, Qatar, TBD |
| C | Brasil, Marruecos, Haití, Escocia |
| D | USA, Paraguay, Australia, TBD |
| E | Alemania, Curazao, Costa de Marfil, Ecuador |
| F | Países Bajos, Japón, Túnez, TBD |
| G | Bélgica, Egipto, Irán, Nueva Zelanda |
| H | España, Cabo Verde, Arabia Saudita, Uruguay |
| I | Francia, Senegal, Noruega, TBD |
| J | Argentina, Argelia, Austria, Jordania |
| K | Portugal, Colombia, Uzbekistán, TBD |
| L | Inglaterra, Croacia, Ghana, Panamá |

---

## Notas de Integración

### ⚠️ Timezone de `local_date`

El campo `local_date` devuelve la hora **local del estadio** donde se juega el partido, NO en UTC ni en Costa Rica. Como los estadios están en USA/Canadá/México (husos UTC-4 a UTC-7), el offset contra CR (UTC-6) varía por partido. No se puede asumir que está en hora CR.

**En esta quiniela:** el ticker (`GET /api/v1/ticker/today`) ahora ignora el `local_date` del API para la hora del partido y usa el `kickoff_utc` de la base de datos local (que tiene las horas CR correctas). Del API solo toma scores en vivo, estado y tiempo transcurrido. Los nombres de equipo se mapean de inglés (API) a español (DB) vía el mapa `enToEs` en `ticker.go`.

---

**Flujo recomendado para la quiniela:**

1. Al arrancar, obtener token vía `POST /auth/authenticate` y cachearlo (dura 84 días).
2. Hacer seed inicial con `GET /get/games` → guardar en BD local con `external_id`.
3. Durante el torneo, hacer polling a `GET /get/games` o `GET /get/game/:id` para detectar cambios en `home_score`, `away_score`, y `finished`.
4. Al detectar `finished: true`, disparar el cálculo de puntos de la quiniela.
5. Actualizar standings propios con `GET /get/groups` tras cada partido.

**Rate limiting:** el servidor tiene rate limit integrado. Usar polling cada 60s durante partidos en vivo es suficiente y seguro.

**Identificadores:** los `team_id` en grupos referencian el `id` del endpoint de equipos. Hacer join por ese campo.

**Torneo:** 11 junio – 19 julio 2026. Fuera de ese rango, `finished` será `false` y scores en `0`.
