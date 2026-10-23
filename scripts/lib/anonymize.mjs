// Anonimización de extractos: sin @usuarios, nombres etiquetados al inicio de comentarios,
// enlaces, correos ni teléfonos. Se recorta a una longitud breve.
export function anonymize(raw, max = 220) {
  let s = String(raw ?? '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/\S+@\S+\.\S+/g, '[correo]')
    .replace(/@[\w.]+/g, '@usuario')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[teléfono]')
    .replace(/\s+/g, ' ')
    .trim();
  // Comentarios de Facebook suelen empezar etiquetando a alguien: "Nombre Apellido texto…"
  s = s.replace(/^((?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|[A-ZÁÉÍÓÚÑ]{2,})(?:\s+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|de|del|la)){1,3})\s+(?=[a-záéíóúñ¿¡])/, '');
  s = s.replace(/^@usuario[\s,:]*/g, '');
  if (s.length > max) s = s.slice(0, s.lastIndexOf(' ', max - 1) > 60 ? s.lastIndexOf(' ', max - 1) : max) + '…';
  return s;
}
