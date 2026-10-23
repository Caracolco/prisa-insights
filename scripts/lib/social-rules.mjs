// Reglas de clasificación de Social Listening: relevancia, voz, duplicados.
// Cada decisión devuelve una razón legible para auditoría (data-quality.json / audit/*.md).
// Principio: una mención es RELEVANTE solo si el texto nombra el producto en sentido literal y,
// CERCA de esa mención, aparece una señal de consumo, compra, preparación, percepción o uso.

export const norm = (s) => String(s ?? '')
  .normalize('NFKC') // 𝐩𝐨𝐥𝐥𝐨 -> pollo
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/@[\w.]+/g, ' ')
  .replace(/#(\w+)/g, ' $1 ')
  .replace(/\s+/g, ' ')
  .trim();

const rx = (src, flags = 'i') => new RegExp(src, flags);
const R = String.raw;

// ---------------------------------------------------------------- producto
export const PRODUCT = {
  huevo: {
    term: R`\b(huev(o|os|ito|itos|ote|otes)|blanquillos?|yemas?|claras? de huevo|omelett?e?s?|eggs?)\b`,
    figurative: [
      [R`\bmand(a|as|an|o|en|aste)\s+huevo`, 'expresión figurada "manda huevo"'],
      [R`(^|[^a-z])a huevo\b`, 'expresión figurada "a huevo"'],
      [R`\bval(e|en|io|ia|i|ga|gan|ian|dra|imos|es)\s+(\w+\s+){0,2}huevos?\b`, 'expresión figurada "vale huevo"'],
      [R`\b(tien(e|en|es)|tuvo|tener|tenga|tengan|tenia|tenian|hay que tener)\s+(mucho\s+|demasiado\s+|bastante\s+|harto\s+|tanto\s+|el\s+)?huevos?\b`, 'expresión figurada "tener huevo(s)" (atrevimiento)'],
      [R`\bhuev(on|ona|ones|onas|onada|onadas|ada|adas|ear|eo|eando|onazo|onsito|onsita)\b`, 'insulto/jerga derivada (huevón, huevada)'],
      [R`\b(mama|mamar|mamen|mamando|mamo|chupa\w*|lamb\w*|lame\w*|sobando|soba\w*|rasca\w*)\s+(de\s+|los\s+|el\s+|un\s+)?huev`, 'insulto vulgar ("mama huevo")'],
      [R`\b(me|le|nos|les|te) (llega|llegan|llego|sudan?|suda|importa|importan) (al |el |los |un )?huevos?\b`, 'expresión figurada "me llega al huevo"'],
      [R`\b(hasta|por|de|con|sus|los|mis|tus|bien puestos|par de)\s+huevos\b(?!\s+(fritos|cocidos|revueltos|de gallina|duros|frescos|organicos|criollos|al|con|en|y|de campo|rancheros|pericos))`, 'referencia anatómica/vulgar "los huevos"'],
      [R`\b(precio|precios) de huevo\b`, 'expresión figurada "a precio de huevo" (muy barato)'],
      [R`\b(cara|cabeza|ojo|ojos|hermano|hermanos) de huevo\b|\bhuevo (por la|en la) cara\b`, 'apodo/insulto'],
      [R`\b(roba(me)?|robar|robando|robas|robo) (un |el |los |mi |tu )?huevos?\b|steal ?an ?egg|robaunhuevo|roblox|brainrot|minecraft|bobicraft|mikecrack|rabstack`, 'videojuego (Roblox "roba un huevo")'],
      [R`huevos? de (pascua|dragon|dinosaurio|serpiente|tortuga|cocodrilo|avestruz|tigre|chocolate|oro|yoshi)|huevo kinder|kinder sorpresa|huevo sorpresa`, 'otro tipo de huevo (juguete, animal silvestre, metáfora)'],
      [R`\b(vete|anda|vaya|andate|ve|vayase) a freir (un )?huevos?`, 'expresión figurada "vete a freír un huevo"'],
      [R`\bun huevo de (plata|dinero|gente|cosas|tiempo|veces|anos)|\bcuesta(n)? un huevo|\bcosto un huevo`, 'expresión figurada "un huevo de" (mucho)'],
      [R`\b(pisando|pisar) huevos\b|poner (todos )?los huevos en (la misma|una) canasta|\bmedio huevo\b|\btren de huevo|\bpelo (al|a un|en el) huevo|\bmodalidad huevo`, 'expresión figurada'],
      [R`(el huevo o la gallina|la gallina o el huevo|primero (fue |el )?(el )?huevo)`, 'dilema figurado "¿el huevo o la gallina?"'],
      [R`\b(costando|cuesta|cuestan|costo|costar|cobran|pagar|pagan|paga|pagando|pague)\s+(a\s+|un\s+)huevo\b(?!\s*(a|en|de|por)?\s*\$?\s?\d)|\bprecio (de )?huevo\b(?!\s*(a|en|de|por|esta|subio)?\s*\$?\s?\d)`, 'expresión figurada de precio ("cuesta un huevo", "pagar a huevo")'],
      [R`\b(mas|menos|tan) \w+( \w+)? (que|q|k|como) (un )?huevo\b|\b(que|q) (un )?huevo (sin sal|frito en)|parece un huevo|mentalidad de huevo|forma de huevo`, 'comparación figurada ("más perdido que huevo frito…")'],
      [R`\b(sabe|sabes|saben|sepa|supo|sabia)\s+(ni\s+)?(freir|fritar|frito|hacer|cocinar|preparar)\s+(ni\s+)?(un\s+)?huevo`, 'modismo de incompetencia ("no sabe freír un huevo")'],
      [R`\b(el|ese|este|al|del) otro huevo\b|\becha(ndo|r) de menos el huevo|\bhuevo diario vieja`, 'insulto/doble sentido'],
      [R`\b(le|les|te|me|nos) falta(n|ba)? huevos?\b|\bhuevo fiscal\b|\bel huevo (que|q) dejaron\b|\blave huevo\b|\b(da|dan|alcanza|alcanzan) (ni )?para (fritar|freir|cocinar|hacer) (ni )?un huevo`, 'modismo ("le falta huevo", "huevo fiscal")'],
      [R`arepa\w*\s*(de|e|'e|e')?\s*huevo.{0,70}\b(bob[oa]\w*|payaso|desocupad\w*|hp|hijueputa|parasito|mamerto|marraketo|zoquete|imbecil|idiota)\b|\b(bob[oa]\w*|payaso|desocupad\w*|hp|hijueputa|parasito|mamerto|marraketo|imbecil|idiota)\b.{0,70}arepa\w*\s*(de|e|'e|e')?\s*huevo`, 'burla política con "arepa de huevo"'],
      [R`\b(gallina|gallinas) (cuando va a |va a |para )?poner (el |un |su )?huevo`, 'comparación figurada (gallina poniendo huevo)'],
    ],
  },
  pollo: {
    term: R`\b(poll(o|os|ito|itos|ita)|pechugas?|muslos? de pollo|alitas?( de pollo)?|nuggets?|broaster|rostizad[oa]s?|chicken|patitas de pollo|menudencias?|gallinas? (criolla|de campo))\b`,
    figurative: [
      [R`\bpollos? hermanos\b|breaking bad`, 'referencia de ficción (Los Pollos Hermanos)'],
      [R`\b(minecraft|roblox|free ?fire|fortnite|gameplay|youtuber|streamer)\b`, 'videojuego/stream (apodo "Pollo")'],
      [R`\b(el|al|del|con el|y el|a el) pollo (es|era|fue|dijo|se fue|juega|jugo|metio|anoto|briceno|ladron|y (mia|tricka|zaneki))\b|@pollo|\bpollo frisby\b(?=\W*$)`, 'apodo de persona ("el Pollo")'],
      [R`\b(cabeza|cara|piernas|cuello) de pollo\b`, 'burla/apodo'],
      [R`\bpollit[oa]s?\b(?=.*\b(nena|mami|bebe|mijo|mija|amor|novia|chica|preciosa|hermosa)\b)`, 'apelativo afectivo ("pollito")'],
      [R`piel de gallina|como (un )?pollo sin cabeza|gallina ciega`, 'expresión figurada'],
    ],
  },
};

// Señales de consumidor. Se buscan en una ventana alrededor de la mención del producto.
export const CUES = {
  consumo: R`\b((yo|me|lo|los|las|la|siempre|no|solo|tambien|casi|ya|nos) (como|comemos)|com(er|erlo|erla|erlos|erse|emos|en|ia|i|io|imos|ido|iendo|ian)|cen(o|ar|amos|e)|desayun\w*|almuerz\w*|almorz\w*|merend\w*|cena|comida|plato|porcion\w*|al dia|diario|diarios|todos los dias|cada (dia|semana)|veces (al dia|por semana|a la semana)|me encanta\w*|me gusta\w*|antoj\w*|hambre|lonchera|menu)\b`,
  compra: R`\b(compr\w*|precio\w*|cuesta|cuestan|costo|costos|caro|cara|caros|carisim\w*|barat\w*|econom\w*|subio|subieron|subida|alza|aumento|inflacion|bolsillo|mercado|supermercado|tienda|carniceria|plaza|cubetas?|carton|cartones|panal|canasta|docena|kilo|kg|libra|pesos|oferta|domicilio\w*|pedido|pedir|pague|pagar|vende\w*|venta)\b|\$\s?\d|\d+[.,]?\d*\s?(mil|pesos|lempiras|soles|cordobas|lucas)\b`,
  preparacion: R`\b(receta\w*|prepar\w*|cocin\w*|frit\w*|freir|freido|asad\w*|horne\w*|horno|hervid\w*|herv\w*|cocid\w*|revuelt\w*|estrellad\w*|pochad\w*|airfryer|air fryer|freidora|sarten|olla|guis\w*|sopa|caldo|sudado|apanad\w*|marin\w*|adob\w*|ingredientes?|sazon\w*|condimen\w*|salsa|arroz con|ensalada|tortilla|sandwich|empanada|perico|omelet\w*|batido|yema|clara)\b`,
  percepcion: R`\b(rico|rica|ricos|ricas|delicios\w*|sabros\w*|sabor\w*|buenisim\w*|exquisit\w*|riquisim\w*|asco|horrible|insipid\w*|jugos\w*|crujiente\w*|doradit\w*|calidad|fresc\w*|podrid\w*|mal estado|danad\w*|vencid\w*|olor|huele|salmonella|contamina\w*|intoxica\w*|hormona\w*|antibiotic\w*|quimic\w*|organic\w*|criollo\w*|campesin\w*|de campo|libre pastoreo|jaula)\b`,
  salud: R`\b(protein\w*|nutri\w*|vitamin\w*|colesterol|dieta\w*|saludable\w*|salud|sano|sana|gym|gimnasio|entren\w*|muscul\w*|calori\w*|keto|ayuno|grasa\w*|diabet\w*|nutriolog\w*|nutricionista|bajar de peso|adelgaz\w*)\b`,
  hogar: R`\b(hij[oa]s?|nin[oa]s?|famil\w*|mama|mami|papa|abuel\w*|esposo|esposa|casa|hogar|colegio|bebes?)\b`,
  mascotas: R`\b(perr[oa]s?|perrit[oa]s?|gat[oa]s?|gatit[oa]s?|michis?|mascotas?|lomit[oa]s?|croquetas?|concentrado|purina|whiskas|dog chow|pedigree|barf|veterinari\w*|cachorr\w*)\b`,
  otros_usos: R`\b(limpias?|ritual\w*|brujeria|mascarilla\w*|cabello|pelo|facial|abono|compost)\b`,
  produccion: R`\b(ponedoras?|granjas?|exportacion\w*|importa(do|da|cion)\w*|galpon\w*|avicult\w*|avicola\w*|productor\w*|gripe aviar|influenza aviar|fenavi|incubad\w*)\b`,
};
const CUE_RX = Object.fromEntries(Object.entries(CUES).map(([k, v]) => [k, rx(v)]));
const STRONG = ['consumo', 'compra', 'preparacion', 'percepcion', 'salud', 'mascotas', 'otros_usos', 'produccion'];

const COMMERCIAL = rx(R`(\bpide (ya|el tuyo|tu)|\bpedidos? (al|por)|\bwhats?app\b|\bwa\.me|\benvios?\b|\bdomicilios? (gratis|sin costo)|\bpromo\b|\bpromocion|\bdescuento|\bdisponibles? en\b|\bsorteo|\bgana(r)? un|\bsiguenos|\bsuscribete|\bvisitanos|\blink en (la )?bio|\benlace (de|en) mi perfil|\bvacante|\bbusca operari|\bse solicita|\bempleo|\bpostulate|\bhorario de atencion|\bcatalogo|\bcupon|\bcodigo de descuento|\bmercado libre\b|\btienda en linea|\bcomenta ["']?quiero|\btenemos (los|todo|una|el)\b|\bencontra(s|ras)?\b|variedad de sabores|\bunicamente (del|esta|este)\b|\bpatrocin\w*|\baprovecha\b|precio especial|\breserva(cion|ciones|r)?\b|\bmenu exclusivo)`);
const MEDIA_BIZ = rx(R`\b(abre|abrio|apertura|inaugura\w*|franquicia\w*|hotspots?|nuevos? restaurantes?|centro comercial|expansion|sede|locales? comerciales?|bufe|resort)\b`);
const SPAM = rx(R`(\bgana dinero|\binvierte|\bcriptomoneda|\bforex|\bbitcoin|\bcasino|\bonlyfans|\bseguidores gratis|\bsigueme y te sigo|\bf4f\b)`);

const GAME = rx(R`\b(roblox|brainrot|robaunhuevo|roba un huevo|robame el huevo|steal ?an ?egg|stealabrainrot|minecraft|bobicraft|mikecrack|rabstack|free ?fire|fortnite|gameplay|avatar world|toca boca)\b`);

const WINDOW = 60;
// Contexto político, delictivo o de insulto: el producto suele aparecer de pasada o como burla
const HOSTILE = rx(R`\b(petro|petrico|petrista\w*|petriste|abelardo|espriella|tigre|uribe\w*|duque|guerriller\w*|mamerto\w*|paraco\w*|aguevard\w*|bukele|cecot|carcel\w*|pres[oa]s|reos?|pandiller\w*|delincuent\w*|criminal\w*|asesin\w*|hp|hijueputa|gonorrea|perra|perrita|zorra|malparid\w*|imbecil\w*|idiota\w*|estupid\w*|izquierda|derecha|zurd\w*|facho\w*|politic[oa]s?|congres\w*|senador\w*|fiscal\w*|genitales|chupan)\b`); // caracteres a cada lado de la mención

function stripFigurative(t, product) {
  let s = t; const reasons = [];
  for (const [src, why] of PRODUCT[product].figurative) {
    const r = rx(src, 'gi');
    if (r.test(s)) { reasons.push(why); s = s.replace(rx(src, 'gi'), ' ▒ '); }
  }
  return { s, reasons };
}

export function literalMentions(t, product) {
  const { s, reasons } = stripFigurative(t, product);
  const r = rx(PRODUCT[product].term, 'gi');
  const spans = [];
  for (const m of s.matchAll(r)) spans.push([m.index, m.index + m[0].length]);
  return { spans, figReasons: reasons, stripped: s };
}

export function windowCues(t, spans) {
  const hits = new Set();
  for (const [a, b] of spans) {
    const w = t.slice(Math.max(0, a - WINDOW), b + WINDOW);
    for (const [k, r] of Object.entries(CUE_RX)) if (r.test(w)) hits.add(k);
  }
  return [...hits];
}

export function allCues(t) {
  return Object.entries(CUE_RX).filter(([, r]) => r.test(t)).map(([k]) => k);
}

export function classifyRelevance(rec, product) {
  const t = norm(`${rec.title ? rec.title + '. ' : ''}${rec.text}`);
  if (!t || t.replace(/[^a-z]/g, '').length < 3) return { rel: 'NO_RELEVANTE', code: 'vacio', reason: 'sin texto o solo emojis/símbolos', t, cues: [] };
  if (SPAM.test(t)) return { rel: 'NO_RELEVANTE', code: 'spam', reason: 'spam', t, cues: [] };

  if (GAME.test(t) || GAME.test(norm(rec.context).slice(0, 300))) return { rel: 'NO_RELEVANTE', code: 'videojuego', reason: 'videojuego/stream (Roblox, Minecraft…): "huevo"/"pollo" como objeto o apodo de juego', t, cues: [] };

  const anyTerm = rx(PRODUCT[product].term).test(t);
  const { spans, figReasons, stripped } = literalMentions(t, product);

  if (!anyTerm) {
    return { rel: 'NO_RELEVANTE', code: 'sin_producto', reason: `no menciona ${product}: coincidió por el tema del hilo u otra palabra clave`, t, cues: [] };
  }
  if (spans.length === 0) {
    return { rel: 'NO_RELEVANTE', code: 'figurado', reason: `uso figurado: ${figReasons[0]}`, t, cues: [] };
  }
  const cues = windowCues(stripped, spans);
  const strong = cues.filter((c) => STRONG.includes(c));
  const commercial = COMMERCIAL.test(t) || rec.isBrandAccount;
  if (commercial && !['Comment', 'Tweet', 'Quote Tweet'].includes(rec.type)) {
    return { rel: 'NO_RELEVANTE', code: 'comercial', reason: 'publicación comercial/promocional sin insight de consumidor', t, cues };
  }
  if (isMediaRec(rec) && MEDIA_BIZ.test(t.slice(0, 300))) {
    return { rel: 'NO_RELEVANTE', code: 'comercial', reason: 'noticia de negocio (aperturas, franquicias, hoteles) sin voz de consumidor', t, cues };
  }
  // Textos largos (artículos) que mencionan el producto de paso: exigir que sea central
  const isMedia = isMediaRec(rec);
  if ((isMedia && spans.length < 3 && !rx(PRODUCT[product].term).test(t.slice(0, 200))) || (t.length > 700 && spans.length < 2 && !rx(PRODUCT[product].term).test(t.slice(0, 300)))) {
    return { rel: 'NO_RELEVANTE', code: 'mencion_lateral', reason: `texto extenso que menciona ${product} de forma lateral`, t, cues };
  }
  if (strong.length > 0 && HOSTILE.test(t) && !strong.some((c) => c === 'compra' || c === 'preparacion' || c === 'mascotas')) {
    return { rel: 'DUDOSO', code: 'contexto_hostil', reason: `menciona ${product} dentro de un comentario político/delictivo o insulto, sin señal de compra o preparación`, t, cues };
  }
  if (strong.length > 0) return { rel: 'RELEVANTE', code: 'literal_con_senal', reason: `menciona ${product} con señal de ${strong.join(', ')}`, t, cues };
  if (t.length < 30) return { rel: 'DUDOSO', code: 'corto', reason: `menciona ${product} sin contexto suficiente (texto muy corto)`, t, cues };
  return { rel: 'DUDOSO', code: 'sin_senal', reason: `menciona ${product} sin señal clara de consumo, compra, preparación o percepción`, t, cues };
}

const isMediaRec = (rec) => rec.type === 'Article' || rec.platform === 'Websites' || rec.platform === 'Blogs';

// Voz: quién habla (consumidor espontáneo vs. creador/medio/marca)
export function voiceOf(rec) {
  if (rec.isBrandAccount) return 'marca';
  if (rec.type === 'Article' || rec.platform === 'Websites' || rec.platform === 'Blogs') return 'medio';
  if (['Comment', 'Tweet', 'Quote Tweet', 'Private message'].includes(rec.type) || ['Reddit', 'Forums', 'Reviews'].includes(rec.platform)) return 'consumidor';
  return 'creador';
}

export const dedupeKey = (t) => t.replace(/[^a-z0-9n ]/g, '').replace(/\s+/g, ' ').trim();
