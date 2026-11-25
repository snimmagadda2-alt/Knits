export interface CatalogItem {
  id: string;
  name: string;
  file: string;
  format: 'pkg' | 'dmg' | 'deb';
  blurb: string;
  version: string;
  category: string;
}

export const CATALOG: CatalogItem[] = [
  {
    id: 'clock',
    name: 'Clock',
    file: 'knits-clock.pkg',
    format: 'pkg',
    blurb: 'A world clock with a live digital face and four time zones.',
    version: '1.2',
    category: 'Utilities',
  },
  {
    id: 'clock',
    name: 'Clock (deb)',
    file: 'knits-clock.deb',
    format: 'deb',
    blurb: 'The same Clock, shipped as a Debian package.',
    version: '1.2',
    category: 'Utilities',
  },
  {
    id: 'weather',
    name: 'Weather',
    file: 'knits-weather.pkg',
    format: 'pkg',
    blurb: 'Five day forecast for Knits Studio, with highs and lows.',
    version: '2.0',
    category: 'Weather',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    file: 'knits-gallery.dmg',
    format: 'dmg',
    blurb: 'A wall of colour tiles, shipped as a disk image.',
    version: '1.0',
    category: 'Photography',
  },
];

export const packageUrl = (file: string) =>
  new URL(`${import.meta.env.BASE_URL}packages/${file}`, window.location.href).href;
