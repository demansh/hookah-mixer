const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const HEART_PATH = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

const ICONS = {
  'heart-plus': {
    filled: false,
    paths: [
      'M13.5 19.5 12 21l-7-7c-1.5-1.45-3-3.2-3-5.5A5.5 5.5 0 0 1 7.5 3c1.76 0 3 .5 4.5 2 1.5-1.5 2.74-2 4.5-2a5.5 5.5 0 0 1 5.402 6.5',
      'M15 15h6',
      'M18 12v6',
    ],
  },
  'heart-off': {
    filled: false,
    paths: [
      'M2 2l20 20',
      'M16.5 16.5 12 21l-7-7c-1.5-1.45-3-3.2-3-5.5a5.5 5.5 0 0 1 2.14-4.35',
      'M8.76 3.1c1.15.22 2.13.78 3.24 1.9 1.5-1.5 2.74-2 4.5-2A5.5 5.5 0 0 1 22 8.5c0 2.12-1.3 3.78-2.67 5.17',
    ],
  },
  heart: {
    filled: true,
    paths: [HEART_PATH],
  },
  star: {
    filled: false,
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  'share-2': {
    filled: false,
    paths: [
      'M21 5a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
      'M9 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
      'M21 19a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
      'M8.59 13.51l6.83 3.98',
      'M15.41 6.51l-6.82 3.98',
    ],
  },
  'maximize-2': {
    filled: false,
    paths: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  },
  'trash-2': {
    filled: false,
    paths: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  },
  'arrow-left': {
    filled: false,
    paths: ['M12 19l-7-7 7-7', 'M19 12H5'],
  },
  sparkles: {
    filled: false,
    paths: [
      'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
      'M20 3v4',
      'M22 5h-4',
      'M4 17v2',
      'M5 18H3',
    ],
  },
};

export function createIcon(name, className) {
  const icon = ICONS[name];
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', icon.filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className);
  icon.paths.forEach((pathData) => {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });
  return svg;
}
