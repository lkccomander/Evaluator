# 🧩 Git Desktop GUI – Flujo stage → main

## 🎯 Objetivo

Construir una aplicación de escritorio (Desktop GUI) que permita a un usuario:

1. Mostrar todos los branch del proyecto.
2. Escoger la ranma
3. Trabajar en la rama seleccionada
2. Hacer commit y push
3. Cambiar a `main`
4. Integrar cambios (`merge` o PR workflow simplificado)

mostrar el comando antes de ejecutar
---

## 🧠 Conceptos base (para el agente)

- **Branch = línea de tiempo de commits**
- **Commit = snapshot del proyecto**
- **stage = ambiente de pruebas**
- **main = producción**

---

## 🔄 Flujo principal

### ✅ Paso 1 – Seleccionar rama `stage`

**UI:**
- Dropdown o selector de ramas
- Botón: `Switch to stage`

**Acción:**
```bash
git checkout stage