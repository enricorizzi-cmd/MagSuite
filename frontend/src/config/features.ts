export type FeatureLeaf = { key: string; label: string; path: string };
export type FeatureSection = { key: string; label: string; children: FeatureLeaf[] };
export type FeaturesMap = Record<string, Record<string, boolean>>;

// Centralized structure of sections and pages to control visibility by company
// NOTE: When adding new pages/routes, update this tree.
export const FEATURES_TREE: FeatureSection[] = [
  {
    key: 'anagrafiche',
    label: 'Anagrafiche',
    children: [
      { key: 'clienti', label: 'Clienti', path: '/anagrafiche/clienti' },
      { key: 'fornitori', label: 'Fornitori', path: '/anagrafiche/fornitori' },
      { key: 'articoli', label: 'Articoli', path: '/anagrafiche/articoli' },
      { key: 'operatori', label: 'Operatori', path: '/anagrafiche/operatori' },
    ],
  },
  {
    key: 'logistica',
    label: 'Logistica',
    children: [
      { key: 'giacenze', label: 'Giacenze', path: '/logistica/giacenze' },
      { key: 'inventario', label: 'Inventario', path: '/logistica/inventario' },
      { key: 'magazzini', label: 'Magazzini', path: '/logistica/magazzini' },
      { key: 'movimenti', label: 'Movimenti', path: '/logistica/movimenti' },
    ],
  },
  {
    key: 'edilizia',
    label: 'Edilizia',
    children: [
      { key: 'sal', label: 'SAL', path: '/edilizia/sal' },
      { key: 'materiali-cantiere', label: 'Materiali di cantiere', path: '/edilizia/materiali-cantiere' },
      { key: 'manodopera-cantiere', label: 'Manodopera di cantiere', path: '/edilizia/manodopera-cantiere' },
    ],
  },
  {
    key: 'risorse-umane',
    label: 'Risorse umane',
    children: [
      { key: 'ferie-permessi', label: 'Ferie & Permessi', path: '/risorse-umane/ferie-permessi' },
      { key: 'entrata-uscita', label: 'Entrata/Uscita', path: '/risorse-umane/entrata-uscita' },
      { key: 'turni', label: 'Turni', path: '/risorse-umane/turni' },
    ],
  },
  {
    key: 'commerciale',
    label: 'Direzione commerciale',
    children: [
      { key: 'bpapp', label: 'BPApp', path: '/direzione-commerciale/bpapp' },
    ],
  },
  {
    key: 'amministrativa',
    label: 'Direzione amministrativa',
    children: [
      { key: 'piano-finanziario', label: 'Piano Finanziario', path: '/direzione-amministrativa/piano-finanziario' },
      { key: 'marginalita', label: 'Marginalità', path: '/direzione-amministrativa/marginalita' },
      { key: 'flusso-di-cassa', label: 'Flusso di Cassa', path: '/direzione-amministrativa/flusso-di-cassa' },
      { key: 'scadenzari', label: 'Scadenzari', path: '/direzione-amministrativa/scadenzari' },
    ],
  },
  {
    key: 'impostazioni',
    label: 'Impostazioni',
    children: [
      // All Settings is always visible to super admins; not included here
      { key: 'users', label: 'Utenti', path: '/users' },
    ],
  },
];

export function buildDefaultFeatures(): FeaturesMap {
  const out: FeaturesMap = {};
  for (const s of FEATURES_TREE) {
    out[s.key] = {};
    for (const leaf of s.children) out[s.key][leaf.key] = true;
  }
  return out;
}

// Merge incoming map with defaults; any new page defaults to enabled
export function mergeWithDefaults(incoming: FeaturesMap | undefined | null): FeaturesMap {
  const base = buildDefaultFeatures();
  const src = incoming || {};
  for (const s of FEATURES_TREE) {
    base[s.key] = base[s.key] || {};
    const section = src[s.key] || {};
    for (const leaf of s.children) {
      const v = (section as any)[leaf.key];
      base[s.key][leaf.key] = typeof v === 'boolean' ? v : true;
    }
  }
  return base;
}

export function isPathEnabled(features: FeaturesMap | null | undefined, path: string): boolean {
  if (!features) return true; // default to visible
  // Always visible paths
  if (path === '/dashboard' || path === '/all-settings') return true;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return true;
  const first = parts[0];
  if (first === 'anagrafiche') return !!features['anagrafiche']?.[parts[1]];
  if (first === 'logistica') return !!features['logistica']?.[parts[1]];
  if (first === 'edilizia') return !!features['edilizia']?.[parts[1]];
  if (first === 'risorse-umane') return !!features['risorse-umane']?.[parts[1]];
  if (first === 'direzione-commerciale') return !!features['commerciale']?.[parts[1]];
  if (first === 'direzione-amministrativa') return !!features['amministrativa']?.[parts[1]];
  if (parts[0] === 'users') return !!features['impostazioni']?.['users'];
  return true;
}

