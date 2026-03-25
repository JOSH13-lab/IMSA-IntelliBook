// ============================================================
//  SCRIPT — Remplacement complet des livres IMSA IntelliBook
//  Nouvelles catégories + livres des PDFs IMSA
//  Usage : node replace-books.js
// ============================================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ── URL couverture Google Books ──
function cover(title, author) {
  const q = encodeURIComponent(`${title} ${author}`);
  return `https://books.google.com/books/content?q=${q}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}

// ============================================================
//  NOUVELLES CATÉGORIES (8 actuelles + filières IMSA)
// ============================================================

const categories = [
  // ── 8 catégories actuelles conservées ──
  { slug: 'romans',       name: 'Romans Africains',             description: 'Fiction, littérature contemporaine et classiques africains et gabonais', icon: 'fa-book-open',      color: 'cover-romans',    gradient: 'linear-gradient(145deg,#1A3A5C,#2E6DA4)', order: 1 },
  { slug: 'histoire',     name: 'Histoire & Patrimoine Gabonais',description: 'Histoire du Gabon, Bwiti, colonisation, indépendance, patrimoine culturel', icon: 'fa-landmark',       color: 'cover-histoire',  gradient: 'linear-gradient(145deg,#2D6A4F,#52B788)', order: 2 },
  { slug: 'sciences',     name: 'Sciences & Recherche',          description: 'Sciences africaines, médecine, mathématiques, recherche universitaire',    icon: 'fa-flask',          color: 'cover-sciences',  gradient: 'linear-gradient(145deg,#0C4A6E,#0EA5E9)', order: 3 },
  { slug: 'informatique', name: 'Informatique & Technologies',   description: 'Innovation africaine, IA, Silicon Savannah, mobile banking, programmation', icon: 'fa-laptop-code',    color: 'cover-info',      gradient: 'linear-gradient(145deg,#3A1C71,#6B48B0)', order: 4 },
  { slug: 'droit',        name: 'Droit & Sciences Politiques',   description: 'Droit gabonais, constitutions africaines, OHADA, CEMAC, institutions',      icon: 'fa-scale-balanced', color: 'cover-droit',     gradient: 'linear-gradient(145deg,#374151,#6B7280)', order: 5 },
  { slug: 'jeunesse',     name: 'Littérature Jeunesse Africaine',description: 'Albums, contes, fables et romans pour jeunes lecteurs africains',            icon: 'fa-star',           color: 'cover-jeunesse',  gradient: 'linear-gradient(145deg,#DB2777,#F472B6)', order: 6 },
  { slug: 'arts',         name: 'Arts, Musique & Culture',       description: 'Musique gabonaise, Iboga, Bwiti, masques, sculpture, cinéma africain',       icon: 'fa-palette',        color: 'cover-arts',      gradient: 'linear-gradient(145deg,#D97706,#F59E0B)', order: 7 },
  { slug: 'economie',     name: 'Économie & Développement',      description: 'Plan Gabon 2030, économie verte, Union Africaine, entrepreneuriat',          icon: 'fa-chart-line',     color: 'cover-economie',  gradient: 'linear-gradient(145deg,#7C3D12,#B45309)', order: 8 },

  // ── Nouvelles filières IMSA (PDF1) ──
  { slug: 'san-bms', name: 'SAN — Biologie Médicale et Sanitaire', description: 'Biologie, biochimie, immunologie, microbiologie médicale et anatomie humaine', icon: 'fa-dna',            color: 'cover-san-bms',  gradient: 'linear-gradient(145deg,#7F1D1D,#DC2626)', order: 9 },
  { slug: 'san-sso', name: 'SAN — Sciences Sociales et Organisationnelles', description: 'Sociologie, psychologie sociale, anthropologie et comportement humain', icon: 'fa-users',          color: 'cover-san-sso',  gradient: 'linear-gradient(145deg,#4C1D95,#7C3AED)', order: 10 },
  { slug: 'san-ema', name: 'SAN — Études de Maïeutique',            description: 'Obstétrique, gynécologie, embryologie, accouchement et soins néonatals',     icon: 'fa-baby',           color: 'cover-san-ema',  gradient: 'linear-gradient(145deg,#831843,#DB2777)', order: 11 },
  { slug: 'san-sin', name: 'SAN — Soins Infirmiers',                description: 'Soins infirmiers, pharmacologie, physiopathologie et diagnostics cliniques',  icon: 'fa-stethoscope',    color: 'cover-san-sin',  gradient: 'linear-gradient(145deg,#065F46,#10B981)', order: 12 },
  { slug: 'bav-s2a', name: 'BAV — Sciences Agronomiques',           description: 'Agronomie, physiologie végétale, agroécologie et agriculture durable',        icon: 'fa-seedling',       color: 'cover-bav-s2a',  gradient: 'linear-gradient(145deg,#14532D,#16A34A)', order: 13 },
  { slug: 'bav-hse', name: 'BAV — Hygiène Sécurité Environnement', description: 'Gestion HSE, sécurité au travail, normes ISO et management des risques',       icon: 'fa-shield-halved',  color: 'cover-bav-hse',  gradient: 'linear-gradient(145deg,#78350F,#D97706)', order: 14 },
  { slug: 'bav-sha', name: 'BAV — Sciences Halieutiques et Aquaculture', description: 'Aquaculture, biologie des poissons, hydrobiologie et gestion des pêcheries', icon: 'fa-fish',           color: 'cover-bav-sha',  gradient: 'linear-gradient(145deg,#0C4A6E,#0284C7)', order: 15 },
  { slug: 'gin-pmi', name: 'GIN — Production et Maintenance Industrielle', description: 'Maintenance industrielle, lean manufacturing, qualité et automatisation', icon: 'fa-gear',           color: 'cover-gin-pmi',  gradient: 'linear-gradient(145deg,#1C1917,#57534E)', order: 16 },
  { slug: 'gin-gel', name: 'GIN — Génie Électrique',                description: 'Génie électrique, machines électriques, électronique et automatique',         icon: 'fa-bolt',           color: 'cover-gin-gel',  gradient: 'linear-gradient(145deg,#1E3A5F,#1D4ED8)', order: 17 },
  { slug: 'gif-rtl', name: 'GIF — Réseaux et Télécommunications',  description: 'Réseaux informatiques, télécoms, protocoles, 5G et sécurité des réseaux',      icon: 'fa-network-wired',  color: 'cover-gif-rtl',  gradient: 'linear-gradient(145deg,#0F172A,#3730A3)', order: 18 },
  { slug: 'gif-glo', name: 'GIF — Génie Logiciel',                 description: 'Génie logiciel, Python, Java, algorithmes et développement web',               icon: 'fa-code',           color: 'cover-gif-glo',  gradient: 'linear-gradient(145deg,#0F2942,#0EA5E9)', order: 19 },
];

// ============================================================
//  LIVRES — PDF 2 (Africains) + PDF 1 (Filières IMSA)
// ============================================================

const books = [

  // ══════════════════════════════
  //  ROMANS AFRICAINS (PDF2)
  // ══════════════════════════════
  { id: 'l-001', title: "L'Enfant noir",                    author: 'Camara Laye',             category: 'romans',   year: 1953, rating: 4.6, summary: "Autobiographie poétique d'un enfant guinéen qui grandit entre tradition et modernité. L'un des premiers grands romans africains francophones." },
  { id: 'l-002', title: "Les Soleils des indépendances",    author: 'Ahmadou Kourouma',        category: 'romans',   year: 1968, rating: 4.5, summary: "Fama, prince d'une lignée royale mandingue, se retrouve démuni après les indépendances africaines. Une critique acerbe des nouvelles élites." },
  { id: 'l-003', title: "Une si longue lettre",             author: 'Mariama Bâ',              category: 'romans',   year: 1979, rating: 4.7, summary: "Ramatoulaye écrit à son amie après la mort de son mari. Un classique du féminisme africain, Prix Noma 1980." },
  { id: 'l-004', title: "Le monde s'effondre",              author: 'Chinua Achebe',           category: 'romans',   year: 1958, rating: 4.9, summary: "Le destin d'Okonkwo, chef igbo du Nigeria, bouleversé par l'arrivée des colonisateurs. Chef-d'œuvre de la littérature africaine mondiale." },
  { id: 'l-005', title: "Verre Cassé",                      author: 'Alain Mabanckou',         category: 'romans',   year: 2005, rating: 4.6, summary: "Dans un bar du Congo-Brazzaville, Verre Cassé consigne les histoires des habitués. Un roman baroque et drôle sur l'Afrique contemporaine." },
  { id: 'l-006', title: "Murambi, le livre des ossements",  author: 'Boubacar Boris Diop',     category: 'romans',   year: 2000, rating: 4.7, summary: "Un roman bouleversant sur le génocide rwandais de 1994. Une des œuvres littéraires les plus importantes sur cette tragédie africaine." },
  { id: 'l-007', title: "L'Aventure ambiguë",               author: 'Cheikh Hamidou Kane',     category: 'romans',   year: 1961, rating: 4.6, summary: "Samba Diallo quitte son pays pour étudier en France et se retrouve déchiré entre deux mondes. Roman philosophique majeur sur l'identité africaine." },
  { id: 'l-008', title: "Petit Pays",                       author: 'Gaël Faye',               category: 'romans',   year: 2016, rating: 4.8, summary: "Gabriel, enfant franco-burundais, voit son paradis d'enfance basculer dans la violence des années 1990. Prix Renaudot 2016." },
  { id: 'l-009', title: "Americanah",                       author: 'Chimamanda Ngozi Adichie', category: 'romans',   year: 2013, rating: 4.7, summary: "Ifemelu quitte le Nigeria pour les États-Unis et découvre pour la première fois qu'elle est noire. Une réflexion profonde sur la race et l'identité." },
  { id: 'l-010', title: "Congo Inc.",                       author: 'In Koli Jean Bofane',     category: 'romans',   year: 2014, rating: 4.4, summary: "Isookanga, jeune Mongo du Congo, décide de conquérir la mondialisation depuis son village. Un roman satirique sur le Congo contemporain." },

  // ══════════════════════════════
  //  HISTOIRE & PATRIMOINE GABONAIS (PDF2)
  // ══════════════════════════════
  { id: 'l-011', title: "Histoire du Gabon : des origines à l'aube du XXIe siècle", author: "Nicolas Métégué N'Nah", category: 'histoire', year: 2006, rating: 4.7, summary: "La première histoire complète du Gabon des origines à nos jours, par le principal historien gabonais. Indispensable pour comprendre le pays." },
  { id: 'l-012', title: "Le Gabon et son ombre",            author: 'François Gaulme',         category: 'histoire', year: 1988, rating: 4.4, summary: "Analyse approfondie de la société gabonaise, de ses structures politiques et de l'héritage colonial. Une référence sur le Gabon contemporain." },
  { id: 'l-013', title: "Les Fangs du Gabon",               author: 'Henri Trilles',           category: 'histoire', year: 1912, rating: 4.3, summary: "Étude ethnographique pionnière sur le peuple Fang du Gabon. Traditions, rites et organisation sociale d'un des peuples les plus nombreux du Gabon." },
  { id: 'l-014', title: "Figures d'hier et d'aujourd'hui",  author: 'Rossatanga-Rignault',     category: 'histoire', year: 2002, rating: 4.3, summary: "Portraits des grandes figures politiques et intellectuelles qui ont façonné l'histoire du Gabon de la période coloniale à l'indépendance." },
  { id: 'l-015', title: "Économie et sociétés d'Afrique centrale", author: 'Grégoire Biyogo', category: 'histoire', year: 2009, rating: 4.4, summary: "Analyse des structures économiques et sociales de l'Afrique centrale. Une étude sur l'organisation des sociétés gabonaises et congolaises." },
  { id: 'l-016', title: "Le Gabon : l'éveil d'une nation",  author: 'Wilson-André Ndombet',    category: 'histoire', year: 2008, rating: 4.4, summary: "La construction de la nation gabonaise de la colonisation française à l'indépendance de 1960. Acteurs, événements et enjeux de cette période fondatrice." },
  { id: 'l-017', title: "Les Mpongwè et l'histoire du Gabon", author: 'Anges Ratanga-Atoz',   category: 'histoire', year: 1992, rating: 4.3, summary: "Histoire du peuple Mpongwè, premiers interlocuteurs des Européens au Gabon. Leur rôle dans le commerce, la politique et la culture gabonaise." },
  { id: 'l-018', title: "Rites de passage au Gabon",        author: 'André Raponda-Walker',    category: 'histoire', year: 1959, rating: 4.6, summary: "Les rites initiatiques des peuples gabonais décrits par le grand ethnologue gabonais. Un patrimoine immatériel exceptionnel mis par écrit." },
  { id: 'l-019', title: "Contes gabonais",                  author: 'André Raponda-Walker',    category: 'histoire', year: 1967, rating: 4.7, summary: "La collection la plus complète des contes traditionnels des peuples du Gabon. Un trésor de la littérature orale gabonaise préservé par Raponda-Walker." },
  { id: 'l-020', title: "Okoumé : Bois du Gabon",           author: 'Collectif',               category: 'histoire', year: 2000, rating: 4.2, summary: "L'histoire de l'okoumé, bois précieux symbol du Gabon, et son rôle dans le développement économique du pays depuis la période coloniale." },

  // ══════════════════════════════
  //  SCIENCES & RECHERCHE (PDF2)
  // ══════════════════════════════
  { id: 'l-021', title: "Méthodologie de la recherche en sciences de l'homme", author: 'Thierry La Garanderie', category: 'sciences', year: 2005, rating: 4.4, summary: "Guide méthodologique complet pour la recherche en sciences humaines et sociales. Des outils pratiques pour les chercheurs africains." },
  { id: 'l-022', title: "Théories de la science",           author: 'Jean-Michel Besnier',     category: 'sciences', year: 2008, rating: 4.3, summary: "Introduction aux grandes théories épistémologiques. De Popper à Kuhn, les fondements philosophiques de la démarche scientifique expliqués." },
  { id: 'l-023', title: "Le chaos et l'harmonie",           author: 'Trinh Xuan Thuan',        category: 'sciences', year: 1998, rating: 4.6, summary: "À la frontière de la physique et de la philosophie, une exploration de l'ordre caché derrière le chaos apparent de l'univers." },
  { id: 'l-024', title: "La Recherche en Afrique : Enjeux et perspectives", author: 'Collectif UNESCO', category: 'sciences', year: 2014, rating: 4.4, summary: "État des lieux de la recherche scientifique africaine, ses défis institutionnels et financiers, et les voies pour renforcer les capacités de recherche." },
  { id: 'l-025', title: "Biodiversité africaine",           author: 'Collectif UNESCO',        category: 'sciences', year: 2010, rating: 4.5, summary: "Inventaire de la biodiversité exceptionnelle du continent africain. Faune, flore, écosystèmes et enjeux de conservation face au changement climatique." },
  { id: 'l-026', title: "L'ordre du temps",                 author: 'Carlo Rovelli',           category: 'sciences', year: 2017, rating: 4.7, summary: "Le physicien Carlo Rovelli explore la nature du temps en physique quantique. Un essai poétique et scientifique sur l'une des grandes questions de la physique." },
  { id: 'l-027', title: "Penser la science",                author: 'Jean-Marc Lévy-Leblond',  category: 'sciences', year: 2005, rating: 4.3, summary: "Réflexions épistémologiques sur la pratique scientifique contemporaine. La science comme culture, ses limites et ses responsabilités sociales." },
  { id: 'l-028', title: "Savoirs locaux et environnement",  author: 'Collectif',               category: 'sciences', year: 2012, rating: 4.3, summary: "Les savoirs écologiques traditionnels des communautés africaines et leur intégration dans les politiques environnementales modernes." },
  { id: 'l-029', title: "La démarche scientifique",         author: 'Gaston Bachelard',        category: 'sciences', year: 1938, rating: 4.6, summary: "La formation de l'esprit scientifique par le grand philosophe français. Un classique de l'épistémologie indispensable pour tout chercheur." },
  { id: 'l-030', title: "Introduction à la pensée complexe", author: 'Edgar Morin',            category: 'sciences', year: 1990, rating: 4.5, summary: "Edgar Morin introduit sa théorie de la complexité pour penser les problèmes du monde contemporain. Un cadre de pensée essentiel pour la recherche africaine." },

  // ══════════════════════════════
  //  INFORMATIQUE & TECHNOLOGIES (PDF2)
  // ══════════════════════════════
  { id: 'l-031', title: "L'intelligence artificielle pour les Nuls", author: 'John Paul Mueller', category: 'informatique', year: 2018, rating: 4.5, summary: "Introduction accessible à l'intelligence artificielle et au machine learning. Des concepts fondamentaux aux applications pratiques, sans prérequis mathématiques." },
  { id: 'l-032', title: "Python Crash Course",              author: 'Eric Matthes',            category: 'informatique', year: 2019, rating: 4.8, summary: "Apprendre Python rapidement par la pratique. Projets concrets, jeux, visualisations de données et applications web. Le guide idéal pour débuter en Python." },
  { id: 'l-033', title: "Réseaux et Télécoms",              author: 'Guy Pujolle',             category: 'informatique', year: 2014, rating: 4.5, summary: "La référence francophone sur les réseaux informatiques et télécommunications. Protocoles, architectures et technologies de réseau expliqués en français." },
  { id: 'l-034', title: "Cybersécurité : Analyser les risques", author: 'Solange Ghernaouti',  category: 'informatique', year: 2017, rating: 4.4, summary: "Méthodes d'analyse et de gestion des risques de cybersécurité pour les entreprises et organisations africaines. Conformité, protection et gouvernance." },
  { id: 'l-035', title: "Le Cloud Computing",               author: 'Guillaume Plouin',        category: 'informatique', year: 2019, rating: 4.4, summary: "Comprendre et déployer le cloud computing en entreprise. AWS, Azure, Google Cloud et les architectures cloud appliquées au contexte africain." },
  { id: 'l-036', title: "Data Science : fondamentaux et études de cas", author: 'Michel Lutz', category: 'informatique', year: 2018, rating: 4.5, summary: "Fondements de la data science avec Python. Analyse de données, machine learning et visualisation avec des cas d'usage tirés du contexte africain." },
  { id: 'l-037', title: "Développement Web avec HTML5 et CSS3", author: 'Christophe Aubry',   category: 'informatique', year: 2016, rating: 4.6, summary: "Maîtriser HTML5 et CSS3 pour créer des sites web modernes et responsives. Du code sémantique aux animations CSS, la référence francophone du web." },
  { id: 'l-038', title: "Le Guide de la Blockchain",        author: 'Jean-Guillaume Dumas',    category: 'informatique', year: 2018, rating: 4.3, summary: "La blockchain expliquée simplement : crypto-monnaies, smart contracts et applications décentralisées. Opportunités pour le développement africain." },
  { id: 'l-039', title: "Algorithmique et structures de données", author: 'Thomas H. Cormen',  category: 'informatique', year: 2009, rating: 4.8, summary: "La bible mondiale des algorithmes. Complexité, tri, graphes, programmation dynamique. La référence absolue pour tout informaticien sérieux." },
  { id: 'l-040', title: "Le Big Data",                      author: 'Thomas Davenport',        category: 'informatique', year: 2014, rating: 4.3, summary: "Comprendre et exploiter le big data en entreprise. Hadoop, Spark et les architectures de traitement massif de données appliquées aux défis africains." },

  // ══════════════════════════════
  //  DROIT & SCIENCES POLITIQUES (PDF2)
  // ══════════════════════════════
  { id: 'l-041', title: "Droit constitutionnel et institutions politiques", author: 'Olivier Duhamel', category: 'droit', year: 2018, rating: 4.5, summary: "Théorie de l'État, sources du droit constitutionnel et institutions politiques comparées. Une référence pour l'étude du droit public africain." },
  { id: 'l-042', title: "L'État au Gabon",                  author: 'Guy Rossatanga-Rignault', category: 'droit',    year: 2005, rating: 4.5, summary: "Analyse juridique et politique de la construction de l'État gabonais depuis l'indépendance. Institutions, constitution et gouvernance au Gabon." },
  { id: 'l-043', title: "Introduction au droit d'Afrique noire", author: 'Jan-Pierre Magnant', category: 'droit',    year: 1994, rating: 4.4, summary: "Présentation des systèmes juridiques africains : droit coutumier, droit moderne et hybridation. Une introduction indispensable au droit africain." },
  { id: 'l-044', title: "Géopolitique de l'Afrique",        author: 'Philippe Hugon',          category: 'droit',    year: 2015, rating: 4.5, summary: "Les grands enjeux géopolitiques africains : ressources naturelles, conflits, frontières héritées du colonialisme et relations avec les puissances mondiales." },
  { id: 'l-045', title: "Droit du travail en Afrique OHADA", author: 'Collectif',              category: 'droit',    year: 2016, rating: 4.4, summary: "Le droit du travail dans l'espace OHADA. Contrats, licenciement, négociation collective et protection sociale dans les pays d'Afrique francophone." },
  { id: 'l-046', title: "L'Afrique noire est-elle maudite ?", author: 'Moussa Konaté',         category: 'droit',    year: 2010, rating: 4.4, summary: "Analyse politique des blocages du développement africain. Corruption, gouvernance et responsabilité des élites africaines face aux défis du continent." },
  { id: 'l-047', title: "L'État en Afrique",                author: 'Jean-François Bayart',    category: 'droit',    year: 1989, rating: 4.6, summary: "La politique du ventre : analyse sociologique de la formation des États africains. Une œuvre majeure de la science politique africaniste." },
  { id: 'l-048', title: "Droit international public",       author: 'Pierre-Marie Dupuy',      category: 'droit',    year: 2018, rating: 4.5, summary: "Le traité de référence en droit international public. Sources, sujets, règlement des différends et rôle des organisations africaines en droit international." },
  { id: 'l-049', title: "Les régimes politiques africains", author: 'Dominique Darbon',        category: 'droit',    year: 2012, rating: 4.3, summary: "Analyse comparative des régimes politiques en Afrique subsaharienne depuis les indépendances. Démocraties, autocraties et transitions politiques." },
  { id: 'l-050', title: "Traité de droit civil",            author: 'Jacques Flour',           category: 'droit',    year: 2013, rating: 4.5, summary: "Le traité de droit civil de référence en droit francophone. Obligations, contrats et responsabilité civile applicables dans les pays OHADA." },

  // ══════════════════════════════
  //  LITTÉRATURE JEUNESSE AFRICAINE (PDF2)
  // ══════════════════════════════
  { id: 'l-051', title: "Akissi",                           author: 'Marguerite Abouet',       category: 'jeunesse', year: 2011, rating: 4.6, summary: "Les aventures d'Akissi, petite fille espiègle d'Abidjan. Une bande dessinée pleine de vie qui capture l'enfance africaine avec humour et tendresse." },
  { id: 'l-052', title: "Kirdi et le secret de la forêt",   author: 'Kidi Bebey',              category: 'jeunesse', year: 2008, rating: 4.4, summary: "Kirdi part à la découverte des secrets de la forêt africaine. Une aventure initiatique pour les jeunes lecteurs sur la relation entre l'homme et la nature." },
  { id: 'l-053', title: "Contes de la brousse et de la forêt", author: 'Ahmadou Kourouma',    category: 'jeunesse', year: 2004, rating: 4.5, summary: "Les contes traditionnels d'Afrique de l'Ouest racontés par le grand écrivain Kourouma. Animaux rusés, sorciers et héros pour les jeunes lecteurs africains." },
  { id: 'l-054', title: "La chèvre de ma grand-mère",       author: 'Collectif',               category: 'jeunesse', year: 2006, rating: 4.3, summary: "Un conte africain sur l'amour entre une grand-mère et sa petite-fille à travers l'histoire d'une chèvre précieuse. Valeurs familiales et traditions africaines." },
  { id: 'l-055', title: "Kirikou et la sorcière",           author: 'Michel Ocelot',           category: 'jeunesse', year: 1998, rating: 4.8, summary: "Kirikou, bébé minuscule mais courageux, affronte la sorcière Karaba pour libérer son village. Un conte africain devenu film d'animation mondial." },
  { id: 'l-056', title: "Le pagne magique",                 author: 'Collectif Jeunesse',      category: 'jeunesse', year: 2003, rating: 4.3, summary: "Un pagne aux pouvoirs magiques offert à une jeune fille africaine. Un conte initiatique sur la générosité, la sagesse et les valeurs traditionnelles africaines." },
  { id: 'l-057', title: "Alba et le mystère du volcan",     author: 'Collectif',               category: 'jeunesse', year: 2015, rating: 4.2, summary: "Alba part à la découverte du mystère d'un volcan africain. Un roman jeunesse d'aventure et de science sur la géologie et les écosystèmes africains." },
  { id: 'l-058', title: "Samba et le lion",                 author: 'Fatou Ndiaye',            category: 'jeunesse', year: 2010, rating: 4.4, summary: "Samba, jeune berger sénégalais, doit protéger son troupeau d'un lion. Un conte initiatique sur le courage, la ruse et le respect de la nature africaine." },
  { id: 'l-059', title: "Les aventures de Leuk-le-lièvre", author: 'Léopold Sédar Senghor',   category: 'jeunesse', year: 1953, rating: 4.7, summary: "Les fables du lièvre rusé, héros des contes wolofs du Sénégal, adaptées pour les enfants africains. Un classique de la littérature jeunesse africaine." },
  { id: 'l-060', title: "Amina la reine guerrière",         author: 'Collectif',               category: 'jeunesse', year: 2017, rating: 4.3, summary: "L'histoire d'Amina, reine guerrière du Zazzau au Nigeria au XVIe siècle, racontée pour les jeunes lecteurs. Une héroïne africaine oubliée de l'histoire." },

  // ══════════════════════════════
  //  ARTS, MUSIQUE & CULTURE (PDF2)
  // ══════════════════════════════
  { id: 'l-061', title: "L'art africain",                   author: 'Kerchache',               category: 'arts',     year: 1988, rating: 4.6, summary: "Introduction complète à l'art africain traditionnel. Sculptures, masques, bronzes et objets rituels de toutes les régions du continent africain." },
  { id: 'l-062', title: "Musiques du Gabon",                author: 'Pierre Sallée',           category: 'arts',     year: 1978, rating: 4.5, summary: "Étude ethnomusicologique des musiques traditionnelles gabonaises. Instruments, rythmes et fonctions sociales de la musique dans les sociétés du Gabon." },
  { id: 'l-063', title: "Masques et sculptures du bassin de l'Ogooué", author: 'Louis Perrois', category: 'arts',    year: 1992, rating: 4.6, summary: "Les masques et sculptures des peuples du bassin de l'Ogooué au Gabon. Fang, Kota, Punu : un patrimoine artistique africain d'exception." },
  { id: 'l-064', title: "Les arts de l'Afrique noire",      author: 'Jean Laude',              category: 'arts',     year: 1966, rating: 4.5, summary: "Histoire et esthétique des arts plastiques africains. Des masques dogons aux bronzes du Bénin, une analyse approfondie de la création artistique africaine." },
  { id: 'l-065', title: "L'épopée du Mvett",                author: 'Tsira Ndong Ndoutoume',   category: 'arts',     year: 1970, rating: 4.7, summary: "L'épopée fondatrice du peuple Fang du Gabon et du Cameroun. Un monument de la littérature orale africaine enfin mis par écrit." },
  { id: 'l-066', title: "Cinéma africain : émergence et développement", author: 'Gaston Kaboré', category: 'arts',  year: 2006, rating: 4.4, summary: "L'histoire et les enjeux du cinéma africain depuis Sembène Ousmane. Réalisateurs, films et politiques culturelles pour un cinéma africain indépendant." },
  { id: 'l-067', title: "Philosophie et culture africaine",  author: 'Fabien Eboussi Boulaga', category: 'arts',     year: 1977, rating: 4.5, summary: "La crise du Muntu : réflexion philosophique sur l'identité africaine face à la modernité occidentale. Un texte fondateur de la philosophie africaine." },
  { id: 'l-068', title: "Rumba Congolaise : Histoire musicale", author: 'Collectif',           category: 'arts',     year: 2010, rating: 4.5, summary: "Histoire de la rumba congolaise, musique africaine qui a conquis le monde. De Brazzaville à Kinshasa, les grands orchestres et leurs légendes." },
  { id: 'l-069', title: "La poésie traditionnelle africaine", author: 'Amadou Hampâté Bâ',    category: 'arts',     year: 1994, rating: 4.6, summary: "La tradition poétique orale de l'Afrique de l'Ouest. Épopées, chants et proverbes des griots comme patrimoine vivant de la culture africaine." },
  { id: 'l-070', title: "Art contemporain africain",         author: 'Simon Njami',            category: 'arts',     year: 2005, rating: 4.4, summary: "Panorama de l'art africain contemporain. Artistes, galeries, biennales et marchés de l'art africain dans un monde globalisé." },

  // ══════════════════════════════
  //  ÉCONOMIE & DÉVELOPPEMENT (PDF2)
  // ══════════════════════════════
  { id: 'l-071', title: "L'Afrique peut-elle partir ?",     author: 'Carlos Lopes',           category: 'economie', year: 2019, rating: 4.6, summary: "L'économiste guinéen analyse les conditions du décollage économique africain. Industrialisation, valeur ajoutée et intégration régionale pour le développement." },
  { id: 'l-072', title: "Économie de l'Afrique",            author: 'Philippe Hugon',         category: 'economie', year: 2018, rating: 4.5, summary: "Analyse économique du continent africain : croissance, inégalités, dette et rôle dans l'économie mondiale. Un bilan rigoureux par le spécialiste français." },
  { id: 'l-073', title: "L'aide au développement en Afrique", author: 'Dambisa Moyo',         category: 'economie', year: 2009, rating: 4.5, summary: "L'aide internationale nuit-elle à l'Afrique ? L'économiste zambienne remet en question 50 ans d'aide au développement et propose des alternatives concrètes." },
  { id: 'l-074', title: "Développement durable en Afrique", author: 'Kako Nubupko',           category: 'economie', year: 2014, rating: 4.4, summary: "Les voies d'un développement durable pour l'Afrique : agriculture, énergie, eau et gouvernance dans le contexte des Objectifs de Développement Durable." },
  { id: 'l-075', title: "Le Plan Stratégique Gabon Émergent", author: 'République Gabonaise', category: 'economie', year: 2012, rating: 4.3, summary: "La feuille de route économique du Gabon pour l'horizon 2025. Diversification économique, Gabon Vert, Gabon Industriel et Gabon des Services." },
  { id: 'l-076', title: "Pétrole et développement au Gabon", author: 'Madeleine Gille',       category: 'economie', year: 2009, rating: 4.3, summary: "La rente pétrolière gabonaise et ses effets sur le développement économique. Malédiction des ressources naturelles et diversification de l'économie gabonaise." },
  { id: 'l-077', title: "Microfinance et développement",    author: 'Muhammad Yunus',         category: 'economie', year: 2007, rating: 4.6, summary: "Prix Nobel de la Paix : Yunus explique comment le microcrédit peut sortir des millions d'Africains de la pauvreté. Grameen Bank et ses répliques africaines." },
  { id: 'l-078', title: "L'Afrique en marche",              author: 'Lionel Zinsou',          category: 'economie', year: 2018, rating: 4.4, summary: "La nouvelle Afrique économique : entrepreneurs, classes moyennes et marchés émergents. Le continent africain comme moteur de la croissance mondiale de demain." },
  { id: 'l-079', title: "Investissements chinois en Afrique", author: 'Deborah Brautigam',    category: 'economie', year: 2009, rating: 4.5, summary: "L'aide et les investissements chinois en Afrique : mythe et réalité. Une analyse rigoureuse et nuancée des relations sino-africaines contemporaines." },
  { id: 'l-080', title: "L'Afrique en 2050",                author: 'Banque Africaine de Développement', category: 'economie', year: 2021, rating: 4.4, summary: "Projections économiques et démographiques de l'Afrique à l'horizon 2050. Jeunesse africaine, urbanisation et scénarios de développement du continent." },

  // ══════════════════════════════
  //  SAN-BMS (PDF1)
  // ══════════════════════════════
  { id: 'l-081', title: "Biologie de Campbell",             author: 'Neil Campbell',           category: 'san-bms', year: 2017, rating: 4.8, summary: "La référence mondiale en biologie. Cellule, génétique, évolution et écologie expliqués avec clarté. Le manuel incontournable de tout étudiant en biologie." },
  { id: 'l-082', title: "Biochimie",                        author: 'Voet',                    category: 'san-bms', year: 2016, rating: 4.7, summary: "Biochimie structurale et métabolique complète. Protéines, enzymes, voies métaboliques et biologie moléculaire. La bible de la biochimie universitaire." },
  { id: 'l-083', title: "Immunologie",                      author: 'Abbas',                   category: 'san-bms', year: 2015, rating: 4.6, summary: "Immunologie fondamentale et clinique. Mécanismes immunitaires innés et adaptatifs, maladies auto-immunes et immunothérapies. Manuel de référence." },
  { id: 'l-084', title: "Génétique médicale",               author: 'Thompson',                category: 'san-bms', year: 2014, rating: 4.5, summary: "Génétique médicale et moléculaire. Hérédité mendélienne, génomique, maladies génétiques et conseil génétique. Pour les étudiants en médecine et biologie." },
  { id: 'l-085', title: "Microbiologie médicale",           author: 'Murray',                  category: 'san-bms', year: 2016, rating: 4.6, summary: "Bactériologie, virologie, mycologie et parasitologie médicales. Agents infectieux, pathogenèse et antibiothérapie. Essentiel pour les étudiants en santé." },
  { id: 'l-086', title: "Anatomie humaine",                 author: 'Netter',                  category: 'san-bms', year: 2019, rating: 4.9, summary: "L'atlas d'anatomie humaine le plus utilisé au monde. Illustrations détaillées de Netter sur tous les systèmes et régions du corps humain." },
  { id: 'l-087', title: "Physiologie humaine",              author: 'Silverthorn',             category: 'san-bms', year: 2016, rating: 4.7, summary: "Physiologie intégrée des systèmes humains. Du nerf au système cardiovasculaire, une approche intégrée de la physiologie pour les étudiants en santé." },
  { id: 'l-088', title: "Histologie",                       author: 'Junqueira',               category: 'san-bms', year: 2015, rating: 4.6, summary: "Histologie de base illustrée. Structure microscopique des tissus et organes humains avec des photographies de microscopie de haute qualité." },
  { id: 'l-089', title: "Biologie cellulaire",              author: 'Alberts',                 category: 'san-bms', year: 2015, rating: 4.7, summary: "La biologie moléculaire de la cellule. ADN, ARN, protéines, division cellulaire et signalisation. La référence mondiale de la biologie cellulaire." },
  { id: 'l-090', title: "Parasitologie",                    author: 'Garcia',                  category: 'san-bms', year: 2016, rating: 4.5, summary: "Parasites humains tropicaux et non-tropicaux. Diagnostic au laboratoire, cycle de vie et traitement des parasitoses. Essentiel en contexte africain." },

  // ══════════════════════════════
  //  SAN-SSO (PDF1)
  // ══════════════════════════════
  { id: 'l-091', title: "Introduction à la sociologie",     author: 'Durkheim',                category: 'san-sso', year: 2013, rating: 4.5, summary: "Les fondements de la sociologie par son père fondateur. Faits sociaux, suicide et division du travail. Un classique incontournable des sciences sociales." },
  { id: 'l-092', title: "Psychologie sociale",              author: 'Myers',                   category: 'san-sso', year: 2012, rating: 4.7, summary: "La pensée sociale, l'influence sociale et les relations sociales expliquées avec rigueur et humour. Le manuel de référence en psychologie sociale." },
  { id: 'l-093', title: "Anthropologie",                    author: 'Ember',                   category: 'san-sso', year: 2011, rating: 4.5, summary: "Introduction complète à l'anthropologie culturelle et physique. Cultures, sociétés, évolution humaine et méthodes de l'anthropologie moderne." },
  { id: 'l-094', title: "Méthodes sociales",                author: 'Babbie',                  category: 'san-sso', year: 2013, rating: 4.5, summary: "Méthodes de recherche en sciences sociales. Enquêtes, entretiens, observation participante et analyse quantitative pour les chercheurs en sciences humaines." },
  { id: 'l-095', title: "Comportement humain",              author: 'Baron',                   category: 'san-sso', year: 2012, rating: 4.4, summary: "Psychologie du comportement humain dans son contexte social. Motivation, émotions, cognition sociale et dynamiques de groupe appliquées au contexte africain." },
  { id: 'l-096', title: "Sociologie santé",                 author: 'Herzlich',                category: 'san-sso', year: 2005, rating: 4.4, summary: "La santé et la maladie comme phénomènes sociaux. Inégalités de santé, systèmes de soins et représentations sociales de la maladie en Afrique." },
  { id: 'l-097', title: "Culture et société",               author: 'Giddens',                 category: 'san-sso', year: 2010, rating: 4.5, summary: "Sociologie de la culture, des identités et des transformations sociales contemporaines. Mondialisation, tradition et modernité dans les sociétés africaines." },
  { id: 'l-098', title: "Psychologie générale",             author: 'Atkinson',                category: 'san-sso', year: 2014, rating: 4.6, summary: "Introduction complète à la psychologie. Perception, apprentissage, mémoire, personnalité et troubles psychologiques. Le manuel de référence en psychologie." },
  { id: 'l-099', title: "Sociologie moderne",               author: 'Touraine',                category: 'san-sso', year: 2007, rating: 4.4, summary: "La sociologie des mouvements sociaux et des acteurs par Alain Touraine. Actions collectives, identités et transformations des sociétés africaines contemporaines." },
  { id: 'l-100', title: "Analyse sociale",                  author: 'Weber',                   category: 'san-sso', year: 2012, rating: 4.5, summary: "L'économie et la société selon Max Weber. Bureaucratie, rationalisation et protestantisme. Les classiques de la sociologie weberienne appliqués à l'Afrique." },

  // ══════════════════════════════
  //  SAN-EMA (PDF1)
  // ══════════════════════════════
  { id: 'l-101', title: "Obstétrique",                      author: 'Lansac',                  category: 'san-ema', year: 2016, rating: 4.7, summary: "Manuel de référence en obstétrique francophone. Grossesse normale et pathologique, accouchement et suites de couches. Pour les sages-femmes et obstétriciens." },
  { id: 'l-102', title: "Gynécologie",                      author: 'Marpeau',                 category: 'san-ema', year: 2015, rating: 4.6, summary: "Gynécologie médicale et chirurgicale complète. Pathologies gynécologiques, contraception, ménopause et cancérologie gynécologique. Référence francophone." },
  { id: 'l-103', title: "Embryologie",                      author: 'Langman',                 category: 'san-ema', year: 2015, rating: 4.6, summary: "Embryologie médicale cliniquement orientée. Développement humain de la fécondation à la naissance avec les malformations congénitales correspondantes." },
  { id: 'l-104', title: "Accouchement",                     author: 'Oxorn',                   category: 'san-ema', year: 2014, rating: 4.7, summary: "Travail et accouchement normaux et dystociques. Présentation, mécanismes et conduite de l'accouchement. Manuel pratique pour les sages-femmes." },
  { id: 'l-105', title: "Grossesse",                        author: 'Kamina',                  category: 'san-ema', year: 2013, rating: 4.5, summary: "Anatomie et physiologie de la grossesse. Modifications anatomiques maternelles, développement fœtal et surveillance de la grossesse normale." },
  { id: 'l-106', title: "Urgences obstétricales",           author: 'Dufour',                  category: 'san-ema', year: 2016, rating: 4.7, summary: "Prise en charge des urgences obstétricales en salle de naissance. Hémorragies, éclampsie, procidence et souffrance fœtale aiguë. Guide pratique." },
  { id: 'l-107', title: "Pelvis féminin",                   author: 'Netter',                  category: 'san-ema', year: 2011, rating: 4.8, summary: "Atlas d'anatomie du pelvis féminin par Netter. Illustrations détaillées des organes reproducteurs féminins, vascularisation et innervation pelviennes." },
  { id: 'l-108', title: "Soins néonatals",                  author: 'OMS',                     category: 'san-ema', year: 2015, rating: 4.6, summary: "Guide OMS des soins essentiels au nouveau-né. Réanimation néonatale, soins du prématuré et prévention des infections. Adapté aux pays à ressources limitées." },
  { id: 'l-109', title: "Suivi grossesse",                  author: 'Collectif',               category: 'san-ema', year: 2014, rating: 4.5, summary: "Protocoles de suivi de la grossesse normale et à risque. Consultations prénatales, examens complémentaires et préparation à l'accouchement." },
  { id: 'l-110', title: "Guide sage-femme",                 author: 'Collectif',               category: 'san-ema', year: 2017, rating: 4.6, summary: "Guide pratique complet pour les sages-femmes. Consultation prénatale, suivi du travail, accouchement et suites de couches. Référence professionnelle." },

  // ══════════════════════════════
  //  SAN-SIN (PDF1)
  // ══════════════════════════════
  { id: 'l-111', title: "Mémo infirmier",                   author: 'Hallouët',                category: 'san-sin', year: 2017, rating: 4.7, summary: "Mémo infirmier complet : pathologies, traitements, soins infirmiers et éducation thérapeutique. Le guide de référence pour les infirmiers en pratique clinique." },
  { id: 'l-112', title: "Physiopathologie",                 author: 'Sabbah',                  category: 'san-sin', year: 2016, rating: 4.6, summary: "Physiopathologie des grandes maladies. Mécanismes des maladies cardiovasculaires, respiratoires, digestives et endocriniennes pour les infirmiers." },
  { id: 'l-113', title: "Calcul de doses",                  author: 'Collectif',               category: 'san-sin', year: 2015, rating: 4.5, summary: "Calculs de doses et préparations médicamenteuses pour les infirmiers. Formules, exercices et cas cliniques pour maîtriser les calculs en soins infirmiers." },
  { id: 'l-114', title: "Soins infirmiers",                 author: 'Collectif',               category: 'san-sin', year: 2018, rating: 4.6, summary: "Soins infirmiers fondamentaux et spécialisés. Techniques de soins, démarche clinique et raisonnement infirmier pour une pratique de qualité." },
  { id: 'l-115', title: "Urgences",                         author: 'Collectif',               category: 'san-sin', year: 2017, rating: 4.7, summary: "Prise en charge infirmière des urgences médicales et chirurgicales. Triage, gestes d'urgence et protocoles pour les infirmiers aux urgences." },
  { id: 'l-116', title: "Anatomie infirmier",               author: 'Collectif',               category: 'san-sin', year: 2016, rating: 4.5, summary: "Anatomie et physiologie pour les infirmiers. Structure et fonctions des systèmes humains avec applications directes aux soins infirmiers quotidiens." },
  { id: 'l-117', title: "Guide clinique",                   author: 'Collectif',               category: 'san-sin', year: 2018, rating: 4.6, summary: "Guide clinique des soins infirmiers. Évaluation clinique, interventions et surveillance des patients dans tous les services hospitaliers." },
  { id: 'l-118', title: "Pathologies",                      author: 'Collectif',               category: 'san-sin', year: 2017, rating: 4.5, summary: "Pathologies médicales et chirurgicales pour les infirmiers. Description des maladies, signes cliniques, traitements et rôle infirmier spécifique." },
  { id: 'l-119', title: "Pharmacologie",                    author: 'Collectif',               category: 'san-sin', year: 2016, rating: 4.6, summary: "Pharmacologie infirmière. Classes médicamenteuses, modes d'action, effets indésirables et surveillance infirmière des principaux traitements." },
  { id: 'l-120', title: "Diagnostic infirmier",             author: 'Collectif',               category: 'san-sin', year: 2018, rating: 4.7, summary: "Diagnostics infirmiers NANDA-I. Problèmes de santé, résultats attendus et interventions infirmières standardisées pour une pratique basée sur les preuves." },

  // ══════════════════════════════
  //  BAV-S2A (PDF1)
  // ══════════════════════════════
  { id: 'l-121', title: "Agronomie",                        author: 'Soltner',                 category: 'bav-s2a', year: 2015, rating: 4.6, summary: "Les bases de la production végétale : sol, eau, plantes et techniques culturales. La référence en agronomie francophone pour les agronomes africains." },
  { id: 'l-122', title: "Physiologie végétale",             author: 'Taiz',                    category: 'bav-s2a', year: 2015, rating: 4.7, summary: "Physiologie végétale moderne. Photosynthèse, croissance, développement et réponses au stress. Le manuel de référence pour les étudiants en agronomie." },
  { id: 'l-123', title: "Agroécologie",                     author: 'Altieri',                 category: 'bav-s2a', year: 2011, rating: 4.5, summary: "Bases scientifiques de l'agroécologie. Agriculture biologique, biodiversité et durabilité des systèmes agricoles africains face aux défis climatiques." },
  { id: 'l-124', title: "Science du sol",                   author: 'Brady',                   category: 'bav-s2a', year: 2016, rating: 4.6, summary: "Nature et propriétés des sols tropicaux africains. Pédologie, fertilité, érosion et gestion durable des sols pour l'agriculture africaine." },
  { id: 'l-125', title: "Production végétale",              author: 'Collectif',               category: 'bav-s2a', year: 2014, rating: 4.4, summary: "Techniques de production des principales cultures africaines : manioc, maïs, cacahuète, coton et cultures vivrières. Guide pratique pour les agronomes." },
  { id: 'l-126', title: "Irrigation",                       author: 'Collectif',               category: 'bav-s2a', year: 2013, rating: 4.3, summary: "Systèmes d'irrigation pour les pays africains. Techniques de conception, gestion de l'eau et irrigation goutte-à-goutte pour l'agriculture en zone tropicale." },
  { id: 'l-127', title: "Économie agricole",                author: 'Collectif',               category: 'bav-s2a', year: 2015, rating: 4.3, summary: "Économie des exploitations agricoles africaines. Marchés agricoles, politiques agricoles et financement de l'agriculture en Afrique subsaharienne." },
  { id: 'l-128', title: "Protection cultures",              author: 'Collectif',               category: 'bav-s2a', year: 2014, rating: 4.4, summary: "Protection phytosanitaire des cultures tropicales. Ravageurs, maladies fongiques et virales des cultures africaines. Lutte intégrée et biopesticides." },
  { id: 'l-129', title: "Agriculture durable",              author: 'Collectif',               category: 'bav-s2a', year: 2016, rating: 4.5, summary: "Principes et pratiques de l'agriculture durable en Afrique. Agrosylviculture, conservation des sols et adaptation au changement climatique." },
  { id: 'l-130', title: "Systèmes agricoles",               author: 'Collectif',               category: 'bav-s2a', year: 2013, rating: 4.3, summary: "Analyse et amélioration des systèmes agricoles africains. Diagnostic agraire, innovation paysanne et développement rural en Afrique subsaharienne." },

  // ══════════════════════════════
  //  BAV-HSE (PDF1)
  // ══════════════════════════════
  { id: 'l-131', title: "Gestion HSE",                      author: 'Collectif',               category: 'bav-hse', year: 2016, rating: 4.4, summary: "Gestion intégrée Hygiène Sécurité Environnement en entreprise. Système de management HSE, audit et certification selon les normes internationales." },
  { id: 'l-132', title: "Sécurité travail",                 author: 'Collectif',               category: 'bav-hse', year: 2015, rating: 4.4, summary: "Prévention des risques professionnels en entreprise. Identification des dangers, évaluation des risques et mise en place d'une culture de sécurité au travail." },
  { id: 'l-133', title: "Hygiène industrielle",             author: 'Collectif',               category: 'bav-hse', year: 2014, rating: 4.3, summary: "Hygiène industrielle et santé au travail. Risques chimiques, physiques et biologiques en milieu professionnel africain. Surveillance et prévention." },
  { id: 'l-134', title: "Normes ISO",                       author: 'Collectif',               category: 'bav-hse', year: 2017, rating: 4.4, summary: "Normes ISO 9001, 14001 et 45001 pour la qualité, l'environnement et la sécurité. Guide de mise en œuvre et certification pour les entreprises africaines." },
  { id: 'l-135', title: "Gestion risques",                  author: 'Collectif',               category: 'bav-hse', year: 2016, rating: 4.4, summary: "Méthodes d'identification et d'évaluation des risques industriels. AMDEC, HAZOP et analyse préliminaire des risques pour les industries africaines." },
  { id: 'l-136', title: "Audit HSE",                        author: 'Collectif',               category: 'bav-hse', year: 2015, rating: 4.3, summary: "Conduite des audits HSE en entreprise. Préparation, réalisation et suivi des actions correctives. Guide pratique pour les auditeurs HSE africains." },
  { id: 'l-137', title: "Prévention",                       author: 'Collectif',               category: 'bav-hse', year: 2017, rating: 4.4, summary: "Principes de prévention des accidents du travail et des maladies professionnelles. Plans de prévention, formation sécurité et culture HSE en entreprise." },
  { id: 'l-138', title: "Environnement",                    author: 'Collectif',               category: 'bav-hse', year: 2016, rating: 4.4, summary: "Management environnemental des entreprises africaines. Impact environnemental, éco-conception et développement durable dans le secteur industriel gabonais." },
  { id: 'l-139', title: "Santé travail",                    author: 'Collectif',               category: 'bav-hse', year: 2015, rating: 4.3, summary: "Médecine du travail et santé au travail en Afrique. Maladies professionnelles, surveillance médicale et aptitude au poste dans le contexte africain." },
  { id: 'l-140', title: "Management sécurité",              author: 'Collectif',               category: 'bav-hse', year: 2017, rating: 4.4, summary: "Système de management de la sécurité et de la santé au travail. Leadership, politique HSE et amélioration continue pour les managers africains." },

  // ══════════════════════════════
  //  BAV-SHA (PDF1)
  // ══════════════════════════════
  { id: 'l-141', title: "Aquaculture",                      author: 'Lucas',                   category: 'bav-sha', year: 2014, rating: 4.5, summary: "Principes et pratiques de l'aquaculture tropicale. Élevage de poissons, crevettes et mollusques en Afrique. Techniques, alimentation et gestion sanitaire." },
  { id: 'l-142', title: "Biologie poissons",                author: 'Bone',                    category: 'bav-sha', year: 2008, rating: 4.6, summary: "Biologie des poissons : anatomie, physiologie, comportement et écologie. Fondements scientifiques pour l'aquaculture et la gestion des pêcheries africaines." },
  { id: 'l-143', title: "Hydrobiologie",                    author: 'Collectif',               category: 'bav-sha', year: 2013, rating: 4.4, summary: "Hydrobiologie des eaux douces tropicales africaines. Écosystèmes lacustres, fluviaux et estuariens du Gabon et du bassin du Congo." },
  { id: 'l-144', title: "Nutrition poissons",               author: 'Halver',                  category: 'bav-sha', year: 2002, rating: 4.5, summary: "Nutrition et alimentation des poissons en aquaculture. Besoins nutritionnels, formulation d'aliments et alimentation en pisciculture tropicale africaine." },
  { id: 'l-145', title: "Élevage",                          author: 'Collectif',               category: 'bav-sha', year: 2015, rating: 4.3, summary: "Élevage aquacole en milieu tropical africain. Tilapia, clarias et carpes : techniques d'élevage intensif et extensif adaptées au contexte africain." },
  { id: 'l-146', title: "Pêche",                            author: 'FAO',                     category: 'bav-sha', year: 2016, rating: 4.5, summary: "Guide FAO des techniques de pêche artisanale en Afrique. Engins de pêche, embarcations et pratiques de pêche responsable dans les eaux africaines." },
  { id: 'l-147', title: "Écologie aquatique",               author: 'Collectif',               category: 'bav-sha', year: 2014, rating: 4.4, summary: "Écologie des milieux aquatiques africains. Biodiversité, chaînes alimentaires et impact humain sur les écosystèmes lacustres et fluviaux d'Afrique." },
  { id: 'l-148', title: "Technologie pêche",                author: 'Collectif',               category: 'bav-sha', year: 2013, rating: 4.3, summary: "Technologies de la pêche et de la conservation du poisson en Afrique. Transformation, conservation et commercialisation des produits halieutiques." },
  { id: 'l-149', title: "Systèmes aquacoles",               author: 'Collectif',               category: 'bav-sha', year: 2016, rating: 4.4, summary: "Conception et gestion des systèmes aquacoles en Afrique. Étangs, cages flottantes et systèmes en recirculation pour la pisciculture africaine." },
  { id: 'l-150', title: "Gestion pêcheries",                author: 'Collectif',               category: 'bav-sha', year: 2015, rating: 4.4, summary: "Gestion durable des pêcheries africaines. Évaluation des stocks, politiques de pêche et co-gestion des ressources halieutiques en Afrique centrale." },

  // ══════════════════════════════
  //  GIN-PMI (PDF1)
  // ══════════════════════════════
  { id: 'l-151', title: "Maintenance industrielle",         author: 'Monchy',                  category: 'gin-pmi', year: 2015, rating: 4.7, summary: "La maintenance industrielle : méthodes, organisation et outils. Maintenance préventive, corrective et conditionnelle pour les industries africaines." },
  { id: 'l-152', title: "Production",                       author: 'Collectif',               category: 'gin-pmi', year: 2014, rating: 4.4, summary: "Gestion de la production industrielle. Planification, ordonnancement et contrôle de la production dans les usines et manufactures africaines." },
  { id: 'l-153', title: "Génie industriel",                 author: 'Maynard',                 category: 'gin-pmi', year: 2001, rating: 4.6, summary: "Handbook du génie industriel. Méthodes, procédés et organisation industrielle. La référence mondiale pour les ingénieurs industriels." },
  { id: 'l-154', title: "Lean manufacturing",               author: 'Womack',                  category: 'gin-pmi', year: 2009, rating: 4.7, summary: "Le système de production Toyota et le lean manufacturing. Élimination des gaspillages, flux tendu et amélioration continue dans l'industrie africaine." },
  { id: 'l-155', title: "Qualité",                          author: 'Juran',                   category: 'gin-pmi', year: 1999, rating: 4.6, summary: "Management de la qualité totale par le père du TQM. Planification, contrôle et amélioration de la qualité dans les entreprises industrielles africaines." },
  { id: 'l-156', title: "Automatisation",                   author: 'Groover',                 category: 'gin-pmi', year: 2015, rating: 4.5, summary: "Automation de la production industrielle. Robots industriels, automates programmables et systèmes de contrôle pour les usines africaines modernes." },
  { id: 'l-157', title: "Logistique",                       author: 'Collectif',               category: 'gin-pmi', year: 2016, rating: 4.4, summary: "Logistique et chaîne d'approvisionnement en Afrique. Transport, entrepôts, distribution et gestion des stocks dans le contexte africain." },
  { id: 'l-158', title: "Organisation",                     author: 'Collectif',               category: 'gin-pmi', year: 2015, rating: 4.3, summary: "Organisation et méthodes industrielles. Analyse du travail, ergonomie et organisation scientifique de la production dans les industries africaines." },
  { id: 'l-159', title: "Méthodes",                         author: 'Collectif',               category: 'gin-pmi', year: 2014, rating: 4.3, summary: "Méthodes et outils de l'amélioration continue. 5S, KAIZEN, SMED et résolution de problèmes pour les ingénieurs industriels africains." },
  { id: 'l-160', title: "Industrie",                        author: 'Collectif',               category: 'gin-pmi', year: 2016, rating: 4.3, summary: "Industrie 4.0 et transformation digitale des usines africaines. IoT industriel, big data et intelligence artificielle dans la production africaine." },

  // ══════════════════════════════
  //  GIN-GEL (PDF1)
  // ══════════════════════════════
  { id: 'l-161', title: "Génie électrique",                 author: 'Chapman',                 category: 'gin-gel', year: 2013, rating: 4.6, summary: "Introduction au génie électrique. Circuits électriques, machines et électronique pour les ingénieurs en génie électrique des universités africaines." },
  { id: 'l-162', title: "Machines électriques",             author: 'Chapman',                 category: 'gin-gel', year: 2012, rating: 4.7, summary: "Machines électriques : moteurs, générateurs et transformateurs. Théorie et applications pour les ingénieurs en énergie électrique." },
  { id: 'l-163', title: "Électronique",                     author: 'Sedra',                   category: 'gin-gel', year: 2014, rating: 4.7, summary: "Microélectronique de Sedra-Smith. Transistors, amplificateurs, circuits numériques et analogiques. La référence mondiale en électronique universitaire." },
  { id: 'l-164', title: "Circuits",                         author: 'Nilsson',                 category: 'gin-gel', year: 2015, rating: 4.6, summary: "Circuits électriques de Nilsson-Riedel. Analyse des circuits DC et AC, transformée de Laplace et quadripôles pour les étudiants en génie électrique." },
  { id: 'l-165', title: "Automatique",                      author: 'Ogata',                   category: 'gin-gel', year: 2010, rating: 4.7, summary: "Ingénierie des systèmes de contrôle par Ogata. Fonction de transfert, réponse temporelle et fréquentielle, correcteurs PID et systèmes asservis." },
  { id: 'l-166', title: "Électrotechnique",                 author: 'Collectif',               category: 'gin-gel', year: 2015, rating: 4.5, summary: "Électrotechnique appliquée aux réseaux électriques africains. Production, transport et distribution de l'énergie électrique en Afrique subsaharienne." },
  { id: 'l-167', title: "Puissance",                        author: 'Mohan',                   category: 'gin-gel', year: 2012, rating: 4.6, summary: "Électronique de puissance par Mohan. Convertisseurs AC-DC, DC-DC, onduleurs et variateurs de vitesse pour les applications industrielles africaines." },
  { id: 'l-168', title: "Instrumentation",                  author: 'Collectif',               category: 'gin-gel', year: 2014, rating: 4.4, summary: "Instrumentation industrielle et mesures électriques. Capteurs, transmetteurs et systèmes d'acquisition de données pour l'industrie africaine." },
  { id: 'l-169', title: "Réseaux électriques",              author: 'Collectif',               category: 'gin-gel', year: 2016, rating: 4.5, summary: "Réseaux électriques africains : production, transport et distribution. Interconnexion des réseaux, énergies renouvelables et smart grids en Afrique." },
  { id: 'l-170', title: "Systèmes",                         author: 'Collectif',               category: 'gin-gel', year: 2015, rating: 4.4, summary: "Systèmes embarqués et IoT pour l'industrie africaine. Microcontrôleurs, FPGA et systèmes temps réel pour les applications industrielles en Afrique." },

  // ══════════════════════════════
  //  GIF-RTL (PDF1)
  // ══════════════════════════════
  { id: 'l-171', title: "Réseaux informatiques",            author: 'Tanenbaum',               category: 'gif-rtl', year: 2011, rating: 4.7, summary: "La référence mondiale sur les réseaux informatiques. Modèle OSI, protocoles TCP/IP, Ethernet et Internet expliqués en détail par Tanenbaum." },
  { id: 'l-172', title: "Télécoms",                         author: 'Haykin',                  category: 'gif-rtl', year: 2001, rating: 4.6, summary: "Systèmes de communication de Haykin. Modulation, codage et transmission des signaux. Fondements des télécommunications pour les ingénieurs africains." },
  { id: 'l-173', title: "Protocoles",                       author: 'Stevens',                 category: 'gif-rtl', year: 1994, rating: 4.8, summary: "TCP/IP Illustrated par Stevens. Les protocoles fondamentaux d'Internet expliqués en profondeur. La bible des administrateurs réseaux africains." },
  { id: 'l-174', title: "Communication numérique",          author: 'Proakis',                 category: 'gif-rtl', year: 2008, rating: 4.6, summary: "Communications numériques de Proakis. Théorie de l'information, codage canal et modulations numériques pour les télécommunications modernes." },
  { id: 'l-175', title: "Wireless",                         author: 'Rappaport',               category: 'gif-rtl', year: 2002, rating: 4.6, summary: "Communications sans fil de Rappaport. Propagation radio, cellulaire, WiFi et systèmes sans fil pour les réseaux mobiles africains 4G et 5G." },
  { id: 'l-176', title: "Internet",                         author: 'Collectif',               category: 'gif-rtl', year: 2016, rating: 4.4, summary: "Architecture et gouvernance de l'Internet africain. Sous-marins câbles, points d'échange et développement de l'Internet en Afrique subsaharienne." },
  { id: 'l-177', title: "Switching",                        author: 'Collectif',               category: 'gif-rtl', year: 2015, rating: 4.4, summary: "Commutation et routage dans les réseaux locaux et étendus. VLAN, spanning tree et configuration des commutateurs Cisco pour les réseaux africains." },
  { id: 'l-178', title: "5G",                               author: 'Collectif',               category: 'gif-rtl', year: 2020, rating: 4.5, summary: "La 5G et ses applications en Afrique. Architecture, fréquences et déploiement des réseaux 5G dans les villes africaines. Opportunités pour le développement." },
  { id: 'l-179', title: "Sécurité",                         author: 'Stallings',               category: 'gif-rtl', year: 2017, rating: 4.6, summary: "Cryptographie et sécurité des réseaux par Stallings. Protocoles SSL/TLS, VPN, pare-feu et sécurité des infrastructures télécom africaines." },
  { id: 'l-180', title: "Routing",                          author: 'Collectif',               category: 'gif-rtl', year: 2016, rating: 4.4, summary: "Routage et protocoles de routage dans les réseaux IP africains. OSPF, BGP et configuration des routeurs pour les opérateurs télécoms africains." },

  // ══════════════════════════════
  //  GIF-GLO (PDF1)
  // ══════════════════════════════
  { id: 'l-181', title: "Génie logiciel",                   author: 'Pressman',                category: 'gif-glo', year: 2015, rating: 4.7, summary: "Ingénierie logicielle de Pressman. Processus, méthodes agiles, tests et qualité logicielle. La référence mondiale du génie logiciel." },
  { id: 'l-182', title: "Python",                           author: 'Lutz',                    category: 'gif-glo', year: 2013, rating: 4.7, summary: "Learning Python de Mark Lutz. Le guide le plus complet pour maîtriser Python. Objets, modules, exceptions et développement avancé en Python." },
  { id: 'l-183', title: "Java",                             author: 'Deitel',                  category: 'gif-glo', year: 2014, rating: 4.6, summary: "Java : comment programmer par Deitel. Programmation orientée objet, Java SE et EE, interfaces graphiques et développement d'applications Java professionnelles." },
  { id: 'l-184', title: "Algorithmes",                      author: 'Cormen',                  category: 'gif-glo', year: 2009, rating: 4.8, summary: "Introduction aux algorithmes de Cormen. La bible mondiale des algorithmes et structures de données. Tri, graphes et programmation dynamique." },
  { id: 'l-185', title: "Systèmes",                         author: 'Tanenbaum',               category: 'gif-glo', year: 2015, rating: 4.6, summary: "Systèmes d'exploitation modernes de Tanenbaum. Processus, mémoire, fichiers et sécurité. Conceptes fondamentaux pour les ingénieurs logiciels africains." },
  { id: 'l-186', title: "Base données",                     author: 'Elmasri',                 category: 'gif-glo', year: 2016, rating: 4.5, summary: "Conception de bases de données relationnelles. SQL, modèle entité-association, normalisation et bases de données NoSQL pour les développeurs africains." },
  { id: 'l-187', title: "Admin système",                    author: 'Nemeth',                  category: 'gif-glo', year: 2010, rating: 4.6, summary: "Administration système Unix et Linux. Configuration, sécurité, automatisation et gestion des serveurs Linux pour les administrateurs systèmes africains." },
  { id: 'l-188', title: "Web",                              author: 'Duckett',                 category: 'gif-glo', year: 2011, rating: 4.7, summary: "HTML et CSS : design et construction de sites web par Duckett. Du HTML5 au CSS3, le guide visuel parfait pour les développeurs web débutants." },
  { id: 'l-189', title: "Architecture",                     author: 'Bass',                    category: 'gif-glo', year: 2012, rating: 4.5, summary: "Architecture logicielle en pratique. Attributs de qualité, tactiques architecturales et documentation des architectures pour les logiciels africains." },
  { id: 'l-190', title: "DevOps",                           author: 'Kim',                     category: 'gif-glo', year: 2016, rating: 4.7, summary: "Le Projet Phénix et le DevOps. Intégration continue, déploiement continu et transformation DevOps pour les équipes de développement logiciel africaines." },
];

// ============================================================
//  SCRIPT PRINCIPAL
// ============================================================

async function replaceBooks() {
  console.log('\n🔄 IMSA IntelliBook — Remplacement complet des livres');
  console.log('═'.repeat(55));

  // ── 1. Vider les livres existants ──
  console.log('\n🗑️  Suppression des livres existants...');
  await pool.query('DELETE FROM reading_progress');
  await pool.query('DELETE FROM reviews');
  await pool.query('DELETE FROM favorites');
  await pool.query('DELETE FROM borrows');
  await pool.query('DELETE FROM books');
  console.log('✅ Livres supprimés');

  // ── 2. Mettre à jour / insérer les catégories ──
  console.log('\n📂 Mise à jour des catégories...');
  for (const cat of categories) {
    await pool.query(`
      INSERT INTO categories (slug, name, description, icon, color_class, gradient, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        icon        = EXCLUDED.icon,
        color_class = EXCLUDED.color_class,
        gradient    = EXCLUDED.gradient,
        sort_order  = EXCLUDED.sort_order
    `, [cat.slug, cat.name, cat.description, cat.icon, cat.color, cat.gradient, cat.order]);
    console.log(`  ✅ ${cat.slug} — ${cat.name}`);
  }

  // ── 3. Insérer les nouveaux livres ──
  console.log('\n📚 Insertion des nouveaux livres...');
  let inserted = 0;
  let errors   = 0;

  for (const book of books) {
    try {
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE slug = $1',
        [book.category]
      );

      if (!catResult.rows[0]) {
        console.warn(`⚠️  Catégorie introuvable : ${book.category}`);
        errors++;
        continue;
      }

      const coverUrl = cover(book.title, book.author);

      await pool.query(`
        INSERT INTO books (
          legacy_id, title, author, category_id,
          year, summary, cover_url,
          average_rating, total_copies, available_copies,
          language, format, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,3,3,'francais','pdf',TRUE)
      `, [
        book.id, book.title, book.author,
        catResult.rows[0].id,
        book.year || null,
        book.summary,
        coverUrl,
        book.rating || 4.0,
      ]);

      process.stdout.write(`  ✅ ${book.id} — ${book.title}\n`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ ${book.id} — ${err.message}`);
      errors++;
    }
  }

  // ── 4. Mettre à jour les compteurs ──
  await pool.query(`
    UPDATE categories c
    SET book_count = (
      SELECT COUNT(*) FROM books b
      WHERE b.category_id = c.id AND b.is_active = TRUE
    )
  `);

  // ── 5. Résumé ──
  console.log('\n' + '═'.repeat(55));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(55));

  const stats = await pool.query(`
    SELECT c.name, COUNT(b.id) AS nb
    FROM categories c
    LEFT JOIN books b ON b.category_id = c.id AND b.is_active = TRUE
    GROUP BY c.id, c.name
    ORDER BY c.sort_order
  `);

  stats.rows.forEach(r => {
    console.log(`  ${r.name.padEnd(45)} ${r.nb} livres`);
  });

  const total = await pool.query('SELECT COUNT(*) FROM books WHERE is_active = TRUE');
  console.log('\n' + '═'.repeat(55));
  console.log(`✅ Insérés  : ${inserted} livres`);
  console.log(`❌ Erreurs  : ${errors}`);
  console.log(`📚 Total    : ${total.rows[0].count} livres en base`);
  console.log(`📂 Catégories : ${categories.length}`);
  console.log('═'.repeat(55));
  console.log('\n🎉 Terminé ! Teste : http://localhost:5000/api/books');
  console.log('             et  : http://localhost:5000/api/categories\n');

  await pool.end();
}

replaceBooks().catch(err => {
  console.error('\n💥 Erreur fatale :', err.message);
  process.exit(1);
});
