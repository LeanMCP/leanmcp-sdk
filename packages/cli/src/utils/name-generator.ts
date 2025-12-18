/**
 * Random readable name generator for projects
 */

const ADJECTIVES = [
  'swift', 'bright', 'calm', 'bold', 'cool', 'crisp', 'dark', 'dawn',
  'deep', 'fair', 'fast', 'fine', 'glad', 'gold', 'good', 'gray',
  'green', 'happy', 'keen', 'kind', 'late', 'lean', 'light', 'long',
  'loud', 'mild', 'neat', 'new', 'nice', 'old', 'pale', 'pink',
  'plain', 'prime', 'pure', 'quick', 'quiet', 'rare', 'red', 'rich',
  'rough', 'royal', 'safe', 'sharp', 'shy', 'silver', 'slim', 'slow',
  'smart', 'smooth', 'soft', 'solid', 'still', 'sunny', 'super', 'sweet',
  'tall', 'tidy', 'tiny', 'true', 'warm', 'wild', 'wise', 'young',
];

// Scientists from around the world (AI, Physics, Math)
const SCIENTISTS = [
  // AI & Computer Science
  'turing', 'hinton', 'lecun', 'bengio', 'ng', 'russell', 'norvig', 'pearl',
  'minsky', 'mccarthy', 'shannon', 'dijkstra', 'knuth', 'hopper', 'lovelace',
  'sutton', 'schmid', 'goodfellow', 'vaswani', 'cho', 'li', 'karpathy',
  // Physics
  'einstein', 'newton', 'hawking', 'feynman', 'bohr', 'planck', 'dirac',
  'heisenberg', 'schrodinger', 'maxwell', 'faraday', 'curie', 'fermi',
  'tesla', 'oppenheimer', 'pauli', 'born', 'yang', 'lee', 'wu', 'chandrasekhar',
  'raman', 'bose', 'salam', 'weinberg', 'gell-mann', 'higgs', 'penrose',
  // Mathematics
  'euler', 'gauss', 'riemann', 'hilbert', 'godel', 'turing', 'nash',
  'ramanujan', 'erdos', 'noether', 'galois', 'cauchy', 'laplace', 'fourier',
  'leibniz', 'pascal', 'fermat', 'descartes', 'archimedes', 'euclid',
  'pythagoras', 'fibonacci', 'cantor', 'poincare', 'kolmogorov', 'bayes',
  'markov', 'rao', 'tao', 'mirzakhani', 'grothendieck', 'wiles', 'perelman',
];

/**
 * Generate a random readable project name like "swift-mcp-42"
 */
export function generateProjectName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const scientist = SCIENTISTS[Math.floor(Math.random() * SCIENTISTS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${scientist}-${num}`;
}

/**
 * Generate a random readable subdomain
 */
export function generateSubdomain(): string {
  return generateProjectName();
}
