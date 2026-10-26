const PRESERVED_PARAMS = ['debug', 'seed'];

export function readRoute() {
  const params = new URLSearchParams(location.search);
  if (params.has('mix')) {
    return { view: 'mix', params };
  }
  if (params.get('view') === 'favorites') {
    return { view: 'favorites', params };
  }
  return { view: 'main', params };
}

export function navigate(params = new URLSearchParams(), { replace = false } = {}) {
  const current = new URLSearchParams(location.search);
  PRESERVED_PARAMS.forEach((name) => {
    if (current.has(name) && !params.has(name)) {
      params.set(name, current.get(name));
    }
  });
  const search = params.toString().replace(/%2C/gi, ',');
  const url = `${location.pathname}${search ? `?${search}` : ''}`;
  const state = { inApp: true };
  if (replace) {
    history.replaceState(state, '', url);
  } else {
    history.pushState(state, '', url);
  }
}

export function canGoBackInApp() {
  return history.state?.inApp === true;
}
