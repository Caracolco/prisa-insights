// Indicadores específicos usados por los insights sociales. Todos se miden sobre la VOZ DEL CONSUMIDOR
// relevante y deduplicada. Los que sostienen un insight se validan con muestra manual
// (precisión registrada en data/editorial/audit-log.json) antes de publicarse.
export const PETS = /\b(perr[oa]s?(?! calientes?)|perrit[oa]s?|gat[oa]s?|gatit[oa]s?|michis?|mascotas?|lomit[oa]s?|peludit[oa]s?|cachorr\w*|pandilla canina)\b/;
const FEED = /\b((le|les|lo|la|los|las) (doy|damos|di|daba|dio|preparo|preparamos|cocino|cocinamos|hago|hice|compro|pongo|coloca|echo|alimento)|darle|darles|dales|dale|alimenta\w*|comen|come|comia|comida (casera |natural |humeda )?(para|de) (mi |los |el |la |mis )?(perr|gat|mascot|michi)|croquet\w*|hervid[oa]|deshebrad[oa]|caldo|crud[oa]|huesos|menudenc\w*|patas de pollo|patitas|mollejas|higado|premio|veterinari\w*|alergi\w*|whiskas|purina|dog chow|barf)\b/;
const TEMPLATE = /(altura|signo|color fav|sexualidad|pronombres)\s*[:\-]/;
const POLLO = /\b(poll(o|os|ito|itos)|pechug\w*|menudenc\w*|patas de pollo|patitas|mollejas|alitas?)\b/;
const HUEVO = /\b(huev(o|os|ito|itos)|yemas?|claras?)\b/;
export const PET_FEED = (t, product = 'pollo') => PETS.test(t) && FEED.test(t) && (product === 'pollo' ? POLLO : HUEVO).test(t) && !TEMPLATE.test(t);

// Para extractos visibles: se excluyen insultos, groserías y ataques políticos
export const UNSAFE_EXCERPT = /\b(hp|hpts?|hijueputa\w*|malparid\w*|maldit[oa]s?|mierda|culero|perra|cabron\w*|estupid[oa]s?|idiota\w*|imbecil\w*|pendej\w*|marica|gonorrea|chingad\w*|verga|puta\w*|put[oa]s?|pinche|carajo|mamerto\w*|aguevard\w*|guerriller\w*|paraco\w*|petro|petrico|petrista\w*|abelardo|uribe|tigre|bukele|trump|sheinbaum|amlo|kirchner\w*|maduro|chavez|castro|comunis\w*|zurd\w*|facho\w*|sexualidad|lesbiana|bisexual|hetero|cocaina|droga\w*|gustavo|petrosky|petroski|vaya a vender|que se vaya|mozo|congresista|senador\w*|alcald\w*)\b/;

const R = (re) => (t) => re.test(t);

// Compra EXPLÍCITA para la mascota (necesaria antes de hablar de "decisor de compra")
const BUY = /\b(compr(o|e|amos|ar|arle|arles|aba|as|a)|le compro|les compro|pido|pedimos|gasto|gastamos|pago|pagamos)\b/;
export const PET_BUY = (t, product = 'pollo') => PET_FEED(t, product) && BUY.test(t);

// Ocasiones de consumo: momentos y situaciones que la conversación nombra explícitamente
export const OCCASIONS = [
  { id: 'desayuno', name: 'Desayuno', products: ['huevo', 'pollo'], test: R(/\b(desayun\w*|en la manana|cada manana|calentado|con arepa|arepa con|cafe con)\b/) },
  { id: 'almuerzo', name: 'Almuerzo', products: ['huevo', 'pollo'], test: R(/\b(almuerz\w*|almorz\w*|corrientazo|menu del dia|al mediodia)\b/) },
  { id: 'cena', name: 'Cena / noche', products: ['huevo', 'pollo'], test: R(/\b(cena|cenar|ceno|cenamos|en la noche|por la noche|de noche)\b/) },
  { id: 'lonchera', name: 'Lonchera y colegio', products: ['huevo', 'pollo'], test: R(/\b(lonchera|lunch|colegio|escuela|recreo|merienda escolar)\b/) },
  { id: 'entreno', name: 'Antes o después de entrenar', products: ['huevo', 'pollo'], test: R(/\b(gym|gimnasio|entren\w*|post ?entreno|pre ?entreno|rutina de ejercicio|masa muscular|volumen|definicion)\b/) },
  { id: 'finde', name: 'Fin de semana y domingo', products: ['huevo', 'pollo'], test: R(/\b(fin de semana|finde|domingo|sabado)\b/) },
  { id: 'celebracion', name: 'Celebraciones', products: ['huevo', 'pollo'], test: R(/\b(cumpleanos|celebra\w*|fiesta|navidad|diciembre|boda|reunion familiar|dia de la madre|dia del padre)\b/) },
  { id: 'rapido', name: 'Cuando no hay tiempo', products: ['huevo', 'pollo'], test: R(/\b(rapid[oa]|en (5|cinco|10|diez|15) minutos|sin tiempo|no tengo tiempo|facil y rapid\w*|practic[oa]|air ?fryer|freidora de aire)\b/) },
  { id: 'rescate', name: 'Cuando no alcanza la plata', products: ['huevo', 'pollo'], test: R(/\b(no (hay|alcanza|tenemos|me alcanza) (para|pa|plata)|a punta de|fin de mes|quincena|solo (arroz|huevo)|lo unico que (hay|comemos)|hambre)\b/) },
  { id: 'enfermo', name: 'Cuando alguien está enfermo', products: ['huevo', 'pollo'], test: R(/\b(enferm[oa]|gripa|gripe|resfri\w*|convalec\w*|caldo para|sopa para|dieta blanda|estomago)\b/) },
  { id: 'mascota', name: 'Comida de la mascota', products: ['huevo', 'pollo'], test: (t, p) => PET_FEED(t, p) },
];
export const SIGNALS = [
  { id: 'mascotasAlimentacion', products: ['pollo', 'huevo'], test: (t, p) => PET_FEED(t, p) },
  { id: 'mascotasCompra', products: ['pollo', 'huevo'], test: (t, p) => PET_BUY(t, p) },
  { id: 'mascotas', products: ['pollo', 'huevo'], test: R(PETS) },
  { id: 'precioPolitizado', products: ['pollo', 'huevo'], topic: 'precio', political: true },
  { id: 'saltoPrecio', products: ['pollo', 'huevo'], test: R(/\b(pas\w*|subi\w*|aument\w*|costaba|valia|estaba)\b[^.?!]{0,45}\$?\s?\d[\d.,]*\s*(mil|pesos|k)?\s*(a|hasta|y ahora)\s*\$?\s?\d/) },
  { id: 'cubetaCarton', products: ['huevo'], test: R(/\b(cubetas?|cartones?|panal(es)?|canasta de huevo|maple|tapa de huevo|docena|kilo de huevo)\b/) },
  { id: 'proteinaFitness', products: ['pollo', 'huevo'], test: R(/\b(protein\w*|prote\b|gym|gimnasio|masa muscular|entren\w*|fitness|macros|deficit calorico|volumen)\b/) },
  { id: 'hormonasQuimicos', products: ['pollo', 'huevo'], test: R(/\b(hormon\w*|ormon\w*|quimic\w*|antibiotic\w*|engordad\w*|inyectad\w*|en (30|treinta|40|cuarenta) dias)\b/) },
  { id: 'salmonella', products: ['pollo', 'huevo'], test: R(/\bsalmonell?\w*/) },
  { id: 'podridoMalEstado', products: ['pollo', 'huevo'], test: R(/\b(podrid[oa]s?|mal estado|echad[oa]s? a perder|apest\w*|huele (feo|mal)|vencid[oa]s?)\b/) },
  { id: 'origenCriollo', products: ['pollo', 'huevo'], test: R(/\b(criollo\w*|de campo|campesin[oa]s?|de rancho|de granja|organic\w*|libre pastoreo|libres? de jaula|gallina pisada|artesanal)\b/) },
  { id: 'importado', products: ['huevo'], test: R(/\b(importad\w*|huevo (chino|americano|estadounidense|extranjero|gringo)|de estados unidos|del exterior)\b/) },
  { id: 'arepaHuevo', products: ['huevo'], test: R(/\barepas? (de |e |'e |e' )?huevo\b|\barepa e'? ?huevo/) },
  { id: 'arepaKpop', products: ['huevo'], test: (t) => /\barepas? (de |e |'e |e' )?huevo\b|\barepa e'? ?huevo/.test(t) && /\b(yoongi|suga|bts|jimin|jhope|j-hope|army|kpop|k-pop|bangtan)\b/.test(t) },
  { id: 'arrozConHuevo', products: ['huevo'], test: R(/\barroz (con|y) huevo|huevo (con|y) arroz\b/) },
  { id: 'desayuno', products: ['pollo', 'huevo'], test: R(/\bdesayun\w*/) },
  { id: 'polloAsado', products: ['pollo'], test: R(/\bpollo asado|asadero|pollo a la brasa|rostizad\w*|broaster\b/) },
  { id: 'comidaFavorita', products: ['pollo', 'huevo'], test: R(/\b(comida fav\w*|comida favorita|mi favorit[oa]|plato favorito)\b/) },
  { id: 'comidaFavTemplate', products: ['pollo'], test: (t) => /\b(comida fav\w*|comida favorita)\b/.test(t) && /(altura|signo|color fav|sexualidad|pronombres|apodo)\s*[:\-]/.test(t) },
  { id: 'familiaNinos', products: ['pollo', 'huevo'], test: R(/\b(hij[oa]s?|nin[oa]s?|lonchera|mis (chamacos|pelados|bebes)|bebe)\b/) },
  { id: 'lavarPollo', products: ['pollo'], test: R(/\b(lav(o|ar|as|an|amos|arlo|ado|en) (el |la |bien el )?pollo|pollo (lavado|sin lavar))\b/) },
  { id: 'usosNoAlimentarios', products: ['huevo'], test: R(/\b(limpias?|ritual\w*|brujeria|mascarilla\w*|cabello|abono|mal de ojo)\b/) },
  { id: 'aspiracion', products: ['pollo'], test: R(/\b(primer sueldo|darse (el|un) gusto|me di el gusto|lujo|cuando hay plata|cuando cobro|quincena|los domingos|el domingo|fin de semana|cumpleanos|celebra\w*)\b/) },
];
