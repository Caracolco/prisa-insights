// Sentimiento contextual y temáticas multi-label para menciones RELEVANTES.
// El sentimiento NO es un conteo de palabras: se evalúa por cláusulas, con negación, contraste
// ("pero", "aunque"), preguntas, ironía y quejas de precio. Cada resultado guarda una razón.

const R = String.raw;
const rx = (s, f = 'i') => new RegExp(s, f);

const POS = [
  [R`\b(que |muy |super |bien |re )?((?<!(los|las|se creen|son|a los|de los|para los|creen|ser) )ric[oa]s?|riquisim[oa]s?|deliciosa?s?|sabros[oa]s?|exquisit[oa]s?|buenisim[oa]s?|delicia)\b`, 'valoración de sabor positiva'],
  [R`\bme (encanta|encantan|encanto|fascina|fascinan|gusta mucho|gustan mucho)\b|\b(lo|la|los|las) amo+\b|\bamo+\b (el|los|la|las|comer)\b|\badoro\b|\bmi (comida|plato) favorit[oa]\b|\b(es|son) mi favorit[oa]|\bcambio todo\b|\b(le|les) (encanta|encantan|encanto|encantaron|fascina|fascino|gusto mucho|gusta mucho)\b|^(a mi )?me gustan? (el|la|los|las|mucho|comer)\b|\bme funciono( super| muy)? bien\b`, 'gusto/preferencia expresada'],
  [R`\b(bajo|bajaron|baja|bajando) (de |el )?precio|\bbajo el (huevo|pollo)\b|\b(ya|mas) barat[oa]s?\b|\bme sobra\b`, 'percepción de baja de precio / asequibilidad'],
  [R`\b(excelente|perfect[oa]|genial|espectacular|brutal|una maravilla|maravillos[oa]|increible|lo mejor|el mejor|la mejor|10 de 10)\b`, 'valoración positiva'],
  [R`\b(gracias por (la|esta|tu|compartir)|que buena receta|buena receta|me salio (perfect|deli|buen)|quedo (perfect|deli|buen|rico)|lo voy a (hacer|preparar|intentar)|la voy a (hacer|preparar|probar))\b`, 'agradecimiento/intención de preparar'],
  [R`\b(recomiendo|vale la pena|muy bueno|muy buena|buenisimo|nutritiv[oa]s?|accesible|bendicion|pura calidad|buena calidad|mejor calidad|mas sano|mas sana)\b`, 'evaluación favorable'],
  [R`(😍|🤤|😋|🥰|❤️|❤|💖|💕|👏|👌|💯|🙌|😻|🫶)`, 'emoji de agrado'],
];
const NEG = [
  [R`\b(car[oa]s?|carisim[oa]s?|costos[oa]|impagable|no alcanza|no me alcanza|ya no alcanza|por las nubes|un robo|abuso|abusivo|especulacion|desproposito|ahora (cuesta|esta|vale|valen|cuestan)|cuesta ahora|(es|como|un) lujo|se cotiza como)\b`, 'queja de precio'],
  [R`\b(subio|subieron|sube|suben|aumento|aumentaron|se disparo|se disparan|se dispararon|disparada|alza|encarec\w*|inflacion|inflasion)\b`, 'percepción de alza de precio'],
  [R`\b(asco|asqueros[oa]|horrible|malisim[oa]s?|mal sabor|sabe (feo|mal|a nada)|insipid[oa]|podrid[oa]s?|mal estado|dañad[oa]s?|vencid[oa]s?|huele (feo|mal)|apesta|crud[oa] por dentro|ha decaido|decaido|ya no es (como antes|lo mismo|igual)|ya no sabe|horroros[oa]s?|apestos[oa]s?|sin sabor|adulterad[oa]s?|echad[oa]s? a perder|ya no come)\b`, 'mala experiencia de producto'],
  [R`\b(salmonell?a|altisim[oa]s?|contaminad[oa]s?|intoxica\w*|me enferme|bacteria\w*|hormona\w*|ormonas|quimicos|antibioticos|veneno|retir(o|an|aron) (de )?lotes?|alerta sanitaria)\b`, 'preocupación sanitaria'],
  [R`\b(estafa|nos roban|me robaron|me negaron|no sirve|pesimo|pesima|terrible|decepcion\w*|indignante|verguenza|injusticia|que rabia|me da rabia|triste|tristeza|miseria|pobreza|cada vez (mas pobre|peor)|a punta de|ni siquiera (tienen|hay|para)|no (hay|tenemos|tienen|alcanza) (ni )?(para|pa)|ya no (vamos a|podemos|se puede)|pidiendo|por como esta la economia|nos toca|me toca|de la chingada|no comemos (sino|mas que)|solo comemos|golpe al bolsillo|se eleva\w*|no (le|les|me|nos) alcanza|no tenia(n)? ni para|ridicul[oa]s?)\b`, 'malestar/queja'],
  [R`\b(hp|hpts?|hijueputa\w*|malparid\w*|maldit[oa]s?|mierda|culero|perra|cabron\w*|estupid[oa]s?|idiota\w*|imbecil\w*|ignorante\w*|mediocre|bob[oa]s|payaso|ladron\w*|corrupt[oa]s?|sinverguenza\w*|porqueria|traga\w*|sons[oa]|vendepatria|venden su patria)\b`, 'tono hostil/insulto'],
  [R`(🤮|🤢|😡|😠|🤬|😤|💔|😢|😞|👎|🤡)`, 'emoji de rechazo o malestar'],
];
const NEGATORS = /\b(no|nunca|ni|tampoco|sin|jamas|nada de)\s+(\w+\s+){0,2}$/;
const CONTRAST = /\b(pero|aunque|aun que|aun k|aunk|sin embargo|aun asi|en cambio|eso si|lo malo|lo bueno|a pesar de)\b/;
const QUESTION = /\?|^(que|como|donde|cuanto|cuantos|cual|cuales|por que|alguien sabe|sera que|se puede)\b/;
const IRONY = rx(R`\b(gracias (a|al) (petro|abelardo|gobierno|presidente|tigre|petrico|amlo|claudia)|que bonito|felicitaciones (al|a) gobierno|bravo gobierno|jaja\w*.*\b(subio|car[oa]|precio|alza|\d+\s?mil)\b|\b(subio|car[oa]|precio|alza|\d+\s?mil)\b.*jaja\w*)`);
const PRICE_JUMP = rx(R`\b(pas\w*|subi\w*|aument\w*|costaba|valia|estaba)\b[^.?!]{0,45}\$?\s?\d[\d.,]*\s*(mil|pesos|k)?\s*(a|hasta|y ahora)\s*\$?\s?\d[\d.,]*`);
const TEMPLATE = rx(R`(altura|signo|color fav|serie fav|sexualidad|edad|pais|pronombres|musica|crush)\s*[:\-]`, 'gi');
const RECIPE_SHARE = rx(R`\b(ingredientes|paso a paso|receta|te comparto|les comparto|hoy les traigo|aprende a)\b`);

function findCues(text, list) {
  const out = [];
  for (const [src, why] of list) {
    for (const m of text.matchAll(rx(src, 'gi'))) {
      const before = text.slice(Math.max(0, m.index - 22), m.index);
      out.push({ why, idx: m.index, negated: NEGATORS.test(before) });
    }
  }
  return out;
}

export function classifySentiment(t, raw, voice) {
  const pos = findCues(t + ' ' + emojiOnly(raw), POS);
  const neg = findCues(t + ' ' + emojiOnly(raw), NEG);
  // Negación: "no está rico" -> negativo ; "no es caro" -> se anula la queja
  const P = pos.filter((c) => !c.negated);
  const N = neg.filter((c) => !c.negated).concat(pos.filter((c) => c.negated).map((c) => ({ ...c, why: `negación de ${c.why}` })));
  const isQuestion = QUESTION.test(t);
  const irony = IRONY.test(t);
  const priceJump = PRICE_JUMP.test(t);
  const reasons = [];
  const whyN = new Set(N.map((c) => c.why));
  const priceNeg = whyN.has('queja de precio') || whyN.has('percepción de alza de precio');
  const praise = P.some((c) => c.why === 'valoración positiva' || c.why === 'evaluación favorable');
  const flavor = P.some((c) => c.why === 'valoración de sabor positiva' || c.why === 'gusto/preferencia expresada');

  if ((t.match(TEMPLATE) || []).length >= 2) {
    return { sentiment: 'NEUTRO', confidence: 0.7, reason: 'formato de presentación personal ("comida fav: …"): preferencia declarada sin valoración', act: 'mencion' };
  }
  if (irony || (praise && (priceJump || priceNeg) && !flavor)) {
    return { sentiment: 'NEGATIVO', confidence: 0.6, reason: 'ironía/sarcasmo: elogio aparente junto a una queja de precio o gobierno', act: 'queja' };
  }
  if (priceJump && !flavor) {
    return { sentiment: 'NEGATIVO', confidence: 0.75, reason: 'reporta un salto de precio ("pasó de X a Y")', act: 'queja' };
  }
  // El tono hostil domina sobre emojis o elogios a terceros, salvo que haya una valoración del producto contrastada
  if (whyN.has('tono hostil/insulto') && !(flavor && CONTRAST.test(t))) {
    return { sentiment: 'NEGATIVO', confidence: 0.7, reason: `tono hostil o insulto${N.length > 1 ? ' + ' + uniq(N.map((c) => c.why)).filter((w) => w !== 'tono hostil/insulto').join(', ') : ''}`, act: 'queja' };
  }

  const hasP = P.length > 0; const hasN = N.length > 0;
  if (hasP && hasN) {
    // ¿polaridades en cláusulas distintas separadas por un conector de contraste?
    const parts = t.split(CONTRAST);
    const contrast = parts.length > 1;
    reasons.push(`positivo: ${uniq(P.map((c) => c.why)).join(', ')}`, `negativo: ${uniq(N.map((c) => c.why)).join(', ')}`);
    const onlyEmojiSide = P.every((c) => c.why.startsWith('emoji')) || N.every((c) => c.why.startsWith('emoji'));
    if (onlyEmojiSide && !contrast) {
      const main = P.every((c) => c.why.startsWith('emoji')) ? 'NEGATIVO' : 'POSITIVO';
      return { sentiment: main, confidence: 0.55, reason: `predomina el texto sobre el emoji (${reasons.join(' | ')})`, act: main === 'NEGATIVO' ? 'queja' : 'valoracion' };
    }
    return { sentiment: 'MIXTO', confidence: contrast ? 0.75 : 0.55, reason: `${contrast ? 'contraste explícito' : 'coexisten valoraciones'} (${reasons.join(' | ')})`, act: 'valoracion' };
  }
  if (isQuestion && !hasN) {
    if (hasP && !P.every((c) => c.why.startsWith('emoji'))) return { sentiment: 'POSITIVO', confidence: 0.5, reason: `pregunta con valoración positiva (${uniq(P.map((c) => c.why)).join(', ')})`, act: 'pregunta' };
    return { sentiment: 'NEUTRO', confidence: 0.7, reason: 'pregunta o consulta sin valoración', act: 'pregunta' };
  }
  if (voice === 'medio' && !(hasN && N.some((c) => c.why === 'preocupación sanitaria'))) {
    return { sentiment: 'NEUTRO', confidence: 0.65, reason: 'contenido informativo de medio (no es opinión del consumidor)', act: 'informacion' };
  }
  if (hasN) {
    const strong = N.length >= 2 || N.some((c) => !c.why.startsWith('emoji'));
    return { sentiment: 'NEGATIVO', confidence: strong ? 0.75 : 0.55, reason: uniq(N.map((c) => c.why)).join(', '), act: 'queja' };
  }
  if (hasP) {
    const strong = P.length >= 2 || P.some((c) => !c.why.startsWith('emoji'));
    const promo = (voice === 'creador' || voice === 'marca') && RECIPE_SHARE.test(t);
    return { sentiment: 'POSITIVO', confidence: promo ? 0.5 : strong ? 0.75 : 0.55, reason: uniq(P.map((c) => c.why)).join(', ') + (promo ? ' (tono descriptivo de quien publica la receta)' : ''), act: RECIPE_SHARE.test(t) ? 'recomendacion' : 'valoracion' };
  }
  return { sentiment: 'NEUTRO', confidence: 0.6, reason: RECIPE_SHARE.test(t) ? 'comparte receta/información sin valoración' : 'menciona el producto sin valoración', act: RECIPE_SHARE.test(t) ? 'informacion' : 'mencion' };
}

const emojiOnly = (raw) => (String(raw).match(/\p{Extended_Pictographic}/gu) || []).join(' ');
const uniq = (a) => [...new Set(a)];

// ------------------------------------------------------------------ temáticas
// Taxonomía consolidada DESPUÉS de explorar n-gramas de las menciones relevantes (ver README > Social).
// Cada temática define en qué productos aplica; solo se publican si superan el umbral de escala.
export const TOPICS = [
  { id: 'precio', name: 'Precio y costo de vida', products: ['huevo', 'pollo'],
    re: R`\b(precio\w*|caro|caros|(esta|estan|muy|mas|tan|super) caras?|carisim\w*|barat\w*|subio|subieron|sube|alza|aumento|inflacion|canasta|cubeta|carton|panal|salario|no alcanza|bolsillo|costo de vida|economic[oa]s?|cuesta|cuestan|ahorr\w*)\b|\$\s?\d|\d+[.,]?\d*\s?(mil|pesos)\b` },
  { id: 'subsistencia', name: 'Comida de rescate', products: ['huevo', 'pollo'],
    re: R`\b(arroz (con|y) (huevo|pollo)|(huevo|pollo) (con|y) arroz|solo (arroz|huevo)|no (hay|tenemos|alcanza) (para|pa)|hambre|lo que come el pobre|comiendo arroz|para (medio )?subsistir|lo unico que (hay|comemos)|olla comun|comedor(es)? comunitario)\b` },
  { id: 'recetas', name: 'Recetas y preparación', products: ['huevo', 'pollo'],
    re: R`\b(receta\w*|prepar\w*|cocin\w*|frit[oa]s?|freir|asad[oa]|al horno|horne\w*|hervid\w*|cocid[oa]s?|revuelt[oa]s?|estrellad[oa]s?|pochad[oa]s?|air ?fryer|freidora|sarten|guis\w*|sopa|caldo|sudado|apanad\w*|marin\w*|ingredientes?|salsa|perico|omelet\w*|tortilla)\b` },
  { id: 'desayuno', name: 'Desayuno y rutina diaria', products: ['huevo'],
    re: R`\b(desayun\w*|en la manana|al dia|todos los dias|cada manana|cafe con|con arepa|arepa con|pan con|calentado|huevos? pericos?|rutina)\b` },
  { id: 'nutricion', name: 'Proteína, nutrición y fitness', products: ['huevo', 'pollo'],
    re: R`\b(protein\w*|nutri\w*|vitamin\w*|colesterol|dieta\w*|saludable\w*|sano|sana|gym|gimnasio|entren\w*|masa muscular|muscul\w*|calori\w*|keto|ayuno|perder grasa|bajar de peso|adelgaz\w*|diabet\w*|fitness|macros)\b` },
  { id: 'calidad', name: 'Calidad, frescura y seguridad', products: ['huevo', 'pollo'],
    re: R`\b(calidad|fresc[oa]s?|podrid[oa]s?|mal estado|dañad[oa]s?|vencid[oa]s?|olor|huele|salmonella|contamina\w*|intoxica\w*|bacteria\w*|hormona\w*|antibiotic\w*|crud[oa]s?|lavar el pollo|lav[oa] el pollo|retir\w* (de )?lotes?|alerta)\b` },
  { id: 'origen', name: 'Origen: criollo, campo y producción', products: ['huevo', 'pollo'],
    re: R`\b(criollo\w*|de campo|campesin\w*|organic\w*|libre pastoreo|libres? de jaula|jaulas?|granjas?|avicult\w*|avicola\w*|productor\w*|importad\w*|chino|americano|estadounidense|fenavi|galpon\w*|gallinas? felices)\b` },
  { id: 'identidad', name: 'Identidad y tradición gastronómica', products: ['huevo', 'pollo'],
    re: R`\b(arepas? de huevo|arepa e huevo|bandeja paisa|tipic[oa]s?|tradici\w*|festival|patrimonio|ajiaco|sancocho|pollo a la brasa|brasa|broaster|gastronomia|comida (colombiana|peruana|mexicana|costena|paisa|casera)|como la hacia mi (abuela|mama)|de mi abuela|sabor de casa|platos? tipicos?)\b` },
  { id: 'comida_rapida', name: 'Comida rápida y domicilios', products: ['pollo'],
    re: R`\b(kfc|frisby|popeyes|kokoriko|el corral|mcdonald\w*|comida rapida|broaster|alitas|nuggets|combo|domicilio\w*|restaurante\w*|asadero|pollo (frito|asado) (de|del)|comida chatarra|delivery|rappi)\b` },
  { id: 'antojo', name: 'Antojo y placer', products: ['huevo', 'pollo'],
    re: R`\b(antoj\w*|que ric[oa]|ric[oa]s?|delicios[oa]s?|sabros[oa]s?|crujiente\w*|doradit[oa]s?|me encanta\w*|comida fav\w*|favorit[oa]|se me hizo agua|hambre)\b|🤤|😋` },
  { id: 'familia', name: 'Familia y hogar', products: ['huevo', 'pollo'],
    // "canasta familiar" es una expresión de precio, no de familia
    re: R`\b(hij[oa]s?|nin[oa]s?|(?<!canasta )famili(a|as)\b|mi familia|mi mama|mi papa|abuel\w*|esposo|esposa|lonchera|en casa|la casa|hogar|almuerzo familiar|bebes?)\b` },
  { id: 'mascotas', name: 'Mascotas', products: ['huevo', 'pollo'],
    re: R`\b(perr[oa]s?(?! calientes?)|perrit[oa]s?|gat[oa]s?|gatit[oa]s?|michis?|mascotas?|lomit[oa]s?|peludit[oa]s?|croquetas?|concentrado|purina|whiskas|dog chow|barf|veterinari\w*|cachorr\w*)\b` },
  { id: 'otros_usos', name: 'Usos no alimentarios', products: ['huevo'],
    re: R`\b(limpias?|ritual\w*|brujeria|mascarilla\w*|cabello|pelo|facial|abono|compost)\b` },
];
const TOPIC_RX = TOPICS.map((tp) => ({ ...tp, rx: rx(tp.re, 'gi') }));
const HARDSHIP = rx(R`\b(solo|no hay|no alcanza|no (le|les|me|nos) alcanza|hambre|pobre\w*|nos toca|me toca|a punta de|lo unico|subsistir|escasamente|ni siquiera|no tenemos|no tienen|necesidad|carencia\w*|crisis|economia)\b`);
const MAX_TOPICS = 3;

export function topicsOf(t, raw, product) {
  const s = t + ' ' + emojiOnly(raw);
  const template = (t.match(TEMPLATE) || []).length >= 2;
  const scored = [];
  for (const tp of TOPIC_RX) {
    if (!tp.products.includes(product)) continue;
    const n = (s.match(tp.rx) || []).length;
    if (!n) continue;
    if (template && tp.id !== 'antojo') continue; // "comida fav: pollo" solo aporta preferencia
    if (tp.id === 'subsistencia' && /arroz (con|y) (huevo|pollo)|(huevo|pollo) (con|y) arroz/.test(t) && !HARDSHIP.test(t) && !/\b(hambre|no (hay|alcanza|tenemos) (para|pa))\b/.test(t)) continue;
    scored.push([tp.id, n]);
  }
  // Textos largos acumulan coincidencias: se conservan las temáticas con más evidencia
  return scored.sort((a, b) => b[1] - a[1]).slice(0, MAX_TOPICS).map(([id]) => id);
}

// Marcadores de contexto político para leer la conversación de precio
export const POLITICAL = rx(R`\b(petro|petrico|abelardo|de la espriella|tigre|gobierno|presidente|uribe|amlo|claudia|sheinbaum|bukele|congreso|ministr\w*|izquierda|derecha|mamerto|paraco|aguevardo)\b`);
