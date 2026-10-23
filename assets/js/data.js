const CATALOG_FILES = {
  brands: 'brands.json',
  tags: 'tags.json',
  tobaccos: 'tobaccos.json',
};

export async function loadCatalog(baseUrl) {
  const entries = await Promise.all(
    Object.entries(CATALOG_FILES).map(async ([key, fileName]) => [
      key,
      await fetchJson(`${baseUrl}/assets/data/${fileName}`),
    ]),
  );
  const catalog = Object.fromEntries(entries);
  catalog.brandsById = new Map(catalog.brands.map((brand) => [brand.id, brand]));
  catalog.tobaccosById = new Map(catalog.tobaccos.map((tobacco) => [tobacco.id, tobacco]));
  return catalog;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }
  return response.json();
}
