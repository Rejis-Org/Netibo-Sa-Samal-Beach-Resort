// Photos shown on /stay. The first photo is the card cover (landscape or square works best);
// every photo listed here is viewable in the gallery, whatever its shape (landscape, square, portrait).
// Left out on purpose: promo posters with text overlays, images with a contact footer bar,
// and near-identical duplicates. Folders without a matching card (tree-house, canteen, resort-general) are not used.
const unitPhotoFiles: Record<string, readonly string[]> = {
  "Casa Liam": [
    "casa-liam/casa-liam-01-landscape.jpg",
    "casa-liam/casa-liam-02-square.jpg",
    "casa-liam/casa-liam-03-landscape.jpg",
  ],
  "Villa Aryanna": [
    "villa-aryana/villa-aryana-02-landscape.jpg",
    "villa-aryana/villa-aryana-06-landscape.jpg",
    "villa-aryana/villa-aryana-03-landscape.jpg",
    "villa-aryana/villa-aryana-04-landscape.jpg",
    "villa-aryana/villa-aryana-05-square.jpg",
    "villa-aryana/villa-aryana-07-portrait.jpg",
  ],
  "Mapitag Function Hall": [
    "mapitag-function-hall/mapitag-function-hall-02-landscape.jpg",
    "mapitag-function-hall/mapitag-function-hall-03-landscape.jpg",
    "mapitag-function-hall/mapitag-function-hall-05-square.jpg",
    "mapitag-function-hall/mapitag-function-hall-06-square.jpg",
    "mapitag-function-hall/mapitag-function-hall-07-square.jpg",
    "mapitag-function-hall/mapitag-function-hall-08-square.jpg",
    "mapitag-function-hall/mapitag-function-hall-09-square.jpg",
    "mapitag-function-hall/mapitag-function-hall-10-square-footer.jpg",
    "mapitag-function-hall/mapitag-function-hall-01-portrait.jpg",
  ],
  "Cozy Alexa": [
    "cozy-alexa/cozy-alexa-04-landscape.jpg",
    "cozy-alexa/cozy-alexa-02-square.jpg",
    "cozy-alexa/cozy-alexa-03-square.jpg",
    "cozy-alexa/cozy-alexa-05-landscape.jpg",
    "cozy-alexa/cozy-alexa-06-landscape.jpg",
    "cozy-alexa/cozy-alexa-07-landscape.jpg",
    "cozy-alexa/cozy-alexa-08-landscape.jpg",
    "cozy-alexa/cozy-alexa-09-landscape.jpg",
  ],
  // 01, 02 and 04 are the same shot; only one is kept. 03 has a text overlay.
  "Cabins Adrean": [
    "cabins-adrean/cabins-adrean-01-landscape.jpg",
  ],
  "Aqua Blaire": [
    "aqua-blaire/aqua-blaire-04-square.jpg",
    "aqua-blaire/aqua-blaire-01-landscape.jpg",
    "aqua-blaire/aqua-blaire-05-square.jpg",
    "aqua-blaire/aqua-blaire-06-square.jpg",
    "aqua-blaire/aqua-blaire-02-portrait.jpg",
    "aqua-blaire/aqua-blaire-03-portrait.jpg",
  ],
  "Open Cottage": [
    "costa-blaize/costa-blaize-01-landscape.jpg",
    "costa-blaize/costa-blaize-04-landscape.jpg",
    "costa-blaize/costa-blaize-02-portrait.jpg",
  ],
  "Umbrella Kubo": [
    "cottage/cottage-05-landscape.jpg",
    "cottage/cottage-06-landscape.jpg",
    "cottage/cottage-01-portrait.jpg",
    "cottage/cottage-02-portrait.jpg",
    "cottage/cottage-03-portrait.jpg",
    "cottage/cottage-04-portrait.jpg",
  ],
};

// Older database rows may still use the previous unit name.
const unitNameAliases: Record<string, string> = { Alexa: "Cozy Alexa" };

export function getUnitPhotos(name: string) {
  return (unitPhotoFiles[unitNameAliases[name] ?? name] ?? []).map((file) => `/images/${file}`);
}
