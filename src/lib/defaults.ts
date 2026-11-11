import type { DomainDef, Template } from './types'

export const BUILTIN_DOMAINS: DomainDef[] = [
  { id: 'bebe', label: 'Bébé', color: '#D9779B', builtin: true },
  { id: 'sante', label: 'Santé', color: '#3B82C4', builtin: true },
  { id: 'maison', label: 'Maison', color: '#C28A1B', builtin: true },
  { id: 'courses', label: 'Courses', color: '#4C9A5B', builtin: true },
  { id: 'admin', label: 'Admin', color: '#7A6FD0', builtin: true },
  { id: 'famille', label: 'Famille', color: '#D9603B', builtin: true },
  { id: 'autre', label: 'Autre', color: '#8A8076', builtin: true },
]

export const DOMAIN_COLORS = ['#17A2A2', '#D9779B', '#3B82C4', '#C28A1B', '#4C9A5B', '#7A6FD0', '#D9603B', '#6B6157']

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'menage', name: 'Ménage maison', domain: 'maison',
    steps: ['Tout ranger', 'Sol : aspirateur + serpillère', 'Faire les lits', 'Laver la salle de bain', 'Laver les toilettes'],
  },
  {
    id: 'depart', name: 'Affaires pour partir', domain: 'famille',
    steps: ['Sac à langer', 'Couches et lingettes', 'Vêtements de rechange', 'Doudou', 'Biberons / repas', 'Pharmacie', 'Chargeurs'],
  },
  {
    id: 'courses', name: 'Courses de la semaine', domain: 'courses',
    steps: ['Vérifier frigo et placards', 'Fruits et légumes', 'Viande / poisson', 'Produits laitiers', 'Pain', 'Produits bébé', 'Produits ménagers'],
  },
]
