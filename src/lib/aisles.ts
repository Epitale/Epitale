/** Rayons du supermarché pour classer la liste de courses. */
export const AISLES = [
  { id: 'fruits', label: 'Fruits et légumes', color: '#4C9A5B' },
  { id: 'frais', label: 'Frais', color: '#3B82C4' },
  { id: 'bebe', label: 'Bébé', color: '#D9779B' },
  { id: 'epicerie', label: 'Épicerie', color: '#C28A1B' },
  { id: 'maison', label: 'Maison', color: '#7A6FD0' },
  { id: 'autre', label: 'Autre', color: '#8A8076' },
] as const

const KEYWORDS: Record<string, string[]> = {
  fruits: ['pomme', 'banane', 'poire', 'orange', 'citron', 'fraise', 'raisin', 'kiwi', 'avocat', 'tomate', 'carotte', 'courgette', 'salade', 'oignon', 'ail', 'pomme de terre', 'patate', 'champignon', 'poivron', 'concombre', 'haricot', 'brocoli', 'epinard', 'légume', 'legume', 'fruit', 'mangue', 'ananas', 'melon', 'cerise', 'abricot', 'pêche', 'peche', 'aubergine', 'courge', 'poireau'],
  frais: ['lait', 'yaourt', 'yogourt', 'fromage', 'beurre', 'crème', 'creme', 'oeuf', 'œuf', 'lardon', 'jambon', 'poulet', 'viande', 'steak', 'poisson', 'saumon', 'saucisse', 'gruyère', 'gruyere', 'mozzarella', 'dinde', 'boeuf', 'bœuf', 'porc', 'thon', 'surimi', 'pâte fraîche', 'tofu', 'skyr', 'faisselle'],
  bebe: ['couche', 'lingette', 'compote', 'biberon', 'lait infantile', 'petit pot', 'petits pots', 'bébé', 'bebe', 'doliprane', 'sérum', 'serum', 'liniment', 'tétine', 'tetine', 'purée bébé', 'céréales bébé'],
  epicerie: ['pâtes', 'pates', 'riz', 'farine', 'sucre', 'sel', 'huile', 'café', 'cafe', 'thé', 'biscuit', 'céréale', 'cereale', 'conserve', 'sauce', 'pain', 'confiture', 'chocolat', 'semoule', 'lentille', 'chips', 'gâteau', 'gateau', 'jus', 'eau', 'vinaigre', 'moutarde', 'ketchup', 'mayonnaise', 'épice', 'epice', 'lait de coco', 'nutella'],
  maison: ['papier', 'essuie', 'lessive', 'liquide vaisselle', 'éponge', 'eponge', 'sac poubelle', 'shampoing', 'savon', 'dentifrice', 'produit', 'javel', 'adoucissant', 'pile', 'ampoule', 'sopalin', 'mouchoir', 'coton', 'gel douche', 'déodorant', 'deodorant'],
}

/** Devine le rayon d'un article à partir de son nom. */
export function guessAisle(text: string): string {
  const t = text.toLowerCase()
  for (const [aisle, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return aisle
  }
  return 'autre'
}

export const DEFAULT_HABITS = ['Lait', 'Pain', 'Couches', 'Compotes', 'Yaourts']
