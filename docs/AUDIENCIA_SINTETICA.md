# Audiencia Sintética — estado y diseño (fase posterior)

## Estado actual (2026-10-22)

- **Sin IA y sin servicios pagos.** La pestaña 07 es un prototipo: responde en el navegador con un motor
  determinístico (`src/ai/engine.ts`) que solo usa los datos del segmento (TGI y Social Listening Colombia).
- Responde con evidencia trazable (fuente, etiqueta, valor) y un nivel de confianza; sin evidencia dice
  "No tengo evidencia suficiente…" y sugiere preguntas que sí la tienen. Rechaza preguntas personales y preguntas
  sobre otro producto.
- La aplicación funciona completa sin esta pestaña.
- Se retoma después de completar Perfil, Actividades y opiniones, Radio, Marcas PRISA, Digital y Social Listening.

## Lo que ya queda preparado

`data/processed/context/<segmento>.audience-context.json` — contexto compacto por segmento: profile, activities,
opinions, futurePlans, radio, prisaBrands, digital, video, podcast, contentThemes, socialListening (Colombia, con
contexto de otros mercados separado y el sentimiento marcado como exploratorio) y crossSourceInsights.

## Diseño propuesto para la fase con IA (no implementado)

```
Frontend → endpoint propio → modelo de lenguaje
              contexto = audience-context.json del segmento (no las 879 variables)
              salida JSON {answer, evidence[], source, confidence}
              validación: todo número citado debe existir en el contexto; si no, responde el motor determinístico
```

Requisitos antes de activarlo: elegir proveedor y costo aceptado, credenciales solo del lado servidor y una
batería de evaluación (preguntas con respuesta esperada y preguntas sin evidencia).
