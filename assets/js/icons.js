const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const ICON_SHAPES = {
  'arrow-left': [
    { tag: 'path', d: 'm12 19-7-7 7-7' },
    { tag: 'path', d: 'M19 12H5' },
  ],
  'lock-open': [
    { tag: 'rect', width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' },
    { tag: 'path', d: 'M7 11V7a5 5 0 0 1 9.9-1' },
  ],
  'lock-keyhole': [
    { tag: 'circle', cx: '12', cy: '16', r: '1' },
    { tag: 'rect', x: '3', y: '10', width: '18', height: '12', rx: '2' },
    { tag: 'path', d: 'M7 10V7a5 5 0 0 1 10 0v3' },
  ],
  share: [
    { tag: 'path', d: 'M12 2v13' },
    { tag: 'path', d: 'm16 6-4-4-4 4' },
    { tag: 'path', d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' },
  ],
  star: [
    { tag: 'path', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  ],
  x: [
    { tag: 'path', d: 'M18 6 6 18' },
    { tag: 'path', d: 'm6 6 12 12' },
  ],
  refresh: [
    { tag: 'path', d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' },
    { tag: 'path', d: 'M21 3v5h-5' },
    { tag: 'path', d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' },
    { tag: 'path', d: 'M8 16H3v5' },
  ],
};

export function createIcon(name) {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  setAttributes(svg, {
    class: 'icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  ICON_SHAPES[name].forEach(({ tag, ...attributes }) => {
    const shape = document.createElementNS(SVG_NAMESPACE, tag);
    setAttributes(shape, attributes);
    svg.append(shape);
  });
  return svg;
}

function setAttributes(element, attributes) {
  Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, value));
}
