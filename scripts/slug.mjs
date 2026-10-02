// Stabile Slugs für Art-IDs (geteilt von build-manifest, lint-data und build-data).
export const slug = s => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const speciesId = ({ name, category }) => category ? `${slug(name)}-${slug(category)}` : slug(name);
