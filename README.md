# PRISA Insights — Audience Intelligence (web)

Versión web, narrativa e interactiva del dashboard Power BI **PRISA Insights**. Es un proyecto
independiente: **no lee ni modifica** el PBIP; solo usa como fuente los XLSX de `Data/TGI`, la carpeta
`Social_Listening` y el diccionario de etiquetas `Dim_TGI_Etiqueta` (lectura).

**Costo: $0.** Procesamiento local, JSON estático, frontend estático y hosting gratuito. No usa APIs de IA
ni servicios pagos. **Mercado principal: Colombia.**

Cada pestaña responde una pregunta:

| # | Pestaña | Pregunta | Estado |
|---|---|---|---|
| 01 | Perfil | ¿Quién es? | Completa |
| 02 | Actividades y opiniones | ¿Cómo vive y qué piensa? | Vista previa con datos |
| 03 | Consumo de radio | ¿Cuándo puedo alcanzarlo? | Vista previa con datos |
| 04 | Marcas PRISA | ¿Dónde tengo mejor oportunidad? | Vista previa con datos |
| 05 | Hábitos digitales | ¿Cómo se comporta conectado? | Vista previa con datos |
| 06 | Social Listening | ¿Qué está diciendo espontáneamente? | Completa (huevo y pollo, Colombia) |
| 07 | Audiencia Sintética | ¿Qué quiero preguntarle? | Prototipo sin IA (fase posterior) |

## Stack

- **Vite + React 18 + TypeScript**, `motion` para transiciones, SVG/canvas propios para gráficos.
- **Archivo** (variable, eje de ancho) servida localmente vía `@fontsource-variable/archivo`.
- Pipeline de datos en **Node** (`xlsx` para TGI, `exceljs` en streaming para los XLSX grandes de Social Listening).
- Sitio **estático**: funciona en GitHub Pages, Cloudflare Pages o el plan gratuito de Cloudflare Workers.

```
src/
  components/   Shell (navegación lateral + selector global), PageHeader, piezas comunes
  sections/     Cover, Perfil, Social, Sintetica (prototipo), Upcoming (vistas previas 02–05)
  charts/       barras, columnas, proporción, sentimiento, tooltips
  motion/       contadores animados
  ai/           engine.ts: motor determinístico del prototipo (sin IA)
  lib/          tipos, formato, carga de datos
scripts/
  import-labels.mjs        Dim_TGI_Etiqueta (TMDL, solo lectura) -> data/dictionaries/tgi-labels.json
  import-tgi.mjs           Data/TGI/*.xlsx -> data/processed/tgi/<segmento>.json
  import-social.mjs        Social_Listening/*.xlsx -> data/raw-cache/*.jsonl (LOCAL, fuera de git)
  classify-social.mjs      relevancia, duplicados, tope por autor, voz, geografía, sentimiento, temáticas, ocasiones, señales
  build-audience-context.mjs  -> public/data/** (web) + data/processed/context/** (contexto para la fase de IA)
  lib/                     configuración, reglas, señales, constructor social, anonimización
  dev/                     QA: capturas (screens.mjs), impresión de muestras de auditoría
data/
  editorial/               redacción de insights y cruces (plantillas; los números los pone el pipeline) + audit-log
  processed/               JSON agregados (versionables)
  raw-cache/               textos originales de Social Listening (LOCAL, ignorado por git)
.github/workflows/pages.yml  publicación gratuita en GitHub Pages
worker/index.ts            Worker opcional (plan gratuito): estáticos + /api/ask determinística
```

## Comandos

```bash
npm install
npm run data:tgi        # XLSX TGI -> JSON
npm run data:social     # Social Listening: importar (≈4 min) + clasificar (≈1 min)
npm run data:build      # JSON por segmento para la web y audience-context
npm run dev             # http://localhost:5173
npm run build           # data:build + typecheck + build estático en dist/
npm run preview         # sirve dist/ como lo haría un hosting estático
```

`npm run data:all` ejecuta toda la cadena. Las rutas de origen se pueden cambiar con
`PRISA_PBI_DIR`, `PRISA_TGI_DIR`, `PRISA_SOCIAL_DIR`, `PRISA_LABELS_TMDL`.

## Cómo agregar un nuevo target TGI

1. Exporta la plantilla TGI (hoja `plantilla`, estructura Elemento / (000) / TOTAL / Segmento) a `Data/TGI/`.
2. Añade una entrada en `SEGMENTS` (`scripts/lib/config.mjs`) con `id`, `name`, `tgiFile` (nombre exacto) y
   `definitionLabel` (definición legible).
3. `npm run data:tgi && npm run data:build`. El segmento aparece en el selector.

Penetración = Segmento(000) / TOTAL del segmento; afinidad = penetración del segmento / penetración en la
población × 100. Los ~108 elementos repetidos de la plantilla se deduplican (igual que en Fact_TGI).

## Cómo actualizar una escucha social

1. Coloca el export (formato Brand24, hoja `Mentions`) en `Social_Listening/` con el nombre indicado en `social:`
   del segmento en `SEGMENTS`. Para una escucha nueva, añade `social` y `product`.
2. `npm run data:social && npm run data:build`.
3. **Audita** antes de publicar: `AUDIT_SEED=<n> npm run data:social:classify` genera muestras nuevas en
   `data/raw-cache/audit/` (incluida una muestra estratificada de sentimiento); léelas con
   `node scripts/dev/audit-print.mjs <producto> relevantes|noRelevantes|sentimiento|tematicas`.
   Registra los resultados en `data/editorial/audit-log.json` (se publican en `data-quality.json`).
4. Revisa `data/editorial/social-insights.json`: cada bloque declara su métrica y sus compuertas; las cifras se
   calculan sobre Colombia. Si un insight falla 3 o más de las 5 preguntas de calidad, no se publica.

### Método de Social Listening

1. **Relevancia** por mención (no por hilo): el texto debe nombrar el producto en sentido literal y, cerca, mostrar
   una señal de consumo, compra, preparación, percepción, salud, uso o mascotas. Se descartan modismos ("manda
   huevo", "huevo fiscal"…), juegos, spam, promociones, noticias de negocio y menciones laterales. Comentarios
   políticos o insultos sin señal de compra/preparación pasan a **dudoso** (no se cuentan).
2. **Duplicados**: textos idénticos normalizados (≥ 20 caracteres) se cuentan una vez.
3. **Tope por autor**: máximo 3 menciones por autor identificado (una cuenta prolífica llegó a aportar 35 de
   las menciones colombianas de huevo).
4. **Geografía — Colombia primero**: las cifras principales usan solo menciones cuyo país es Colombia. Las que no
   traen país se reportan como "país no identificado" y nunca se asumen colombianas. Otros países son contexto
   secundario y se rotulan como tal; una señal que vive fuera de Colombia se dice explícitamente.
5. **Voz**: consumidor (comentarios, tweets, foros) vs. creador, medio y marca; los insights usan la voz del consumidor.
6. **Temáticas** multi-label (máx. 3 por mención) descubiertas con n-gramas; **ocasiones de consumo**; **señales**
   específicas (con precisión auditada cuando sostienen un insight).
7. **Sentimiento**: lectura exploratoria. La auditoría independiente estratificada dio 60 % de acuerdo
   (≈67 % huevo / ≈74 % pollo ponderado), por debajo del 80 % requerido: no se publica como KPI.

## Publicación gratuita

**GitHub Pages:** sube el repositorio a GitHub, en *Settings → Pages* elige "GitHub Actions" y haz push a `main`.
El flujo `.github/workflows/pages.yml` construye con `BASE_PATH=/<repo>/` y publica `dist/`.

**Cloudflare (plan gratuito):** `npx wrangler login` y `npx wrangler deploy` tras `npm run build` (sirve `dist/` y
una `/api/ask` determinística). Opcional: la web no la necesita.

## Audiencia Sintética (fase posterior)

Hoy es un prototipo que responde en el navegador con un motor determinístico basado en los datos del segmento,
sin IA. El contexto para una futura conversación con un modelo ya está preparado en
`data/processed/context/<segmento>.audience-context.json` (perfil, actividades, opiniones, planes, radio, marcas
PRISA, digital, video, podcast, contenidos, Social Listening Colombia y cruces). Ver `docs/AUDIENCIA_SINTETICA.md`.

## Privacidad

- Los XLSX originales y la caché con textos (`data/raw-cache/`) nunca se versionan (`.gitignore`).
- La web solo recibe agregados y extractos anonimizados (sin usuarios, enlaces, correos ni teléfonos; nombres
  etiquetados al inicio de comentarios eliminados; se excluyen extractos con insultos o ataques políticos).

## Limitaciones conocidas

- Clasificación por reglas auditadas: humor, ironía y slang regional siguen siendo la principal fuente de error.
- La base colombiana de pollo es pequeña (≈440 menciones de consumidores): varias ocasiones y señales no alcanzan
  evidencia suficiente y se muestran como tal.
- Las cifras sociales son proporciones de la conversación relevante, no incidencia en la población.
