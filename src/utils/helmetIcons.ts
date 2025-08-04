// Utility functions for helmet and logo paths
export function getTeamHelmetPath(teamId: string): string {
  // Map team IDs to their abbreviations for helmet paths
  const teamAbbreviations: { [key: string]: string } = {
    'ravens': 'bal',
    'browns': 'cle',
    'bengals': 'cin',
    'steelers': 'pit',
    'texans': 'hou',
    'colts': 'ind',
    'jaguars': 'jax',
    'titans': 'ten',
    'bills': 'buf',
    'dolphins': 'mia',
    'jets': 'nyj',
    'patriots': 'ne',
    'chiefs': 'kc',
    'raiders': 'lv',
    'chargers': 'lac',
    'broncos': 'den',
    'bears': 'chi',
    'lions': 'det',
    'packers': 'gb',
    'vikings': 'min',
    'falcons': 'atl',
    'panthers': 'car',
    'saints': 'no',
    'buccaneers': 'tb',
    'cowboys': 'dal',
    'eagles': 'phi',
    'giants': 'nyg',
    'commanders': 'was',
    'cardinals': 'ari',
    'rams': 'lar',
    '49ers': 'sf',
    'seahawks': 'sea'
  };
  
  const abbreviation = teamAbbreviations[teamId.toLowerCase()] || teamId.toLowerCase();
  return `/icons/${abbreviation}-helmet.png`;
}

export function getTeamHelmetFlippedPath(teamId: string): string {
  // Map team IDs to their abbreviations for helmet paths
  const teamAbbreviations: { [key: string]: string } = {
    'ravens': 'bal',
    'browns': 'cle',
    'bengals': 'cin',
    'steelers': 'pit',
    'texans': 'hou',
    'colts': 'ind',
    'jaguars': 'jax',
    'titans': 'ten',
    'bills': 'buf',
    'dolphins': 'mia',
    'jets': 'nyj',
    'patriots': 'ne',
    'chiefs': 'kc',
    'raiders': 'lv',
    'chargers': 'lac',
    'broncos': 'den',
    'bears': 'chi',
    'lions': 'det',
    'packers': 'gb',
    'vikings': 'min',
    'falcons': 'atl',
    'panthers': 'car',
    'saints': 'no',
    'buccaneers': 'tb',
    'cowboys': 'dal',
    'eagles': 'phi',
    'giants': 'nyg',
    'commanders': 'was',
    'cardinals': 'ari',
    'rams': 'lar',
    '49ers': 'sf',
    'seahawks': 'sea'
  };
  
  const abbreviation = teamAbbreviations[teamId.toLowerCase()] || teamId.toLowerCase();
  return `/icons/${abbreviation}-helmet-flipped.png`;
}

export function getConferenceHelmetPath(conference: 'AFC' | 'NFC'): string {
  return `/icons/${conference.toLowerCase()}.png`;
}

export function getNFLLogoPath(): string {
  return `/icons/nfl-logo.png`;
}

// Check if helmet image exists (for fallback to text)
export function getTeamDisplay(teamId: string, isHome: boolean = false): {
  type: 'image' | 'text';
  content: string;
  alt?: string;
} {
  const helmetPath = isHome ? getTeamHelmetFlippedPath(teamId) : getTeamHelmetPath(teamId);
  
  // For now, assume images exist - in production you'd check if the file exists
  return {
    type: 'image',
    content: helmetPath,
    alt: `${teamId} helmet`
  };
}

/**
 * Check if helmet icon exists (for conditional rendering)
 */
export function hasTeamHelmet(teamId: string): boolean {
  // This is a simple check - in a real app you might want to preload or cache this
  return true; // Assume all helmets exist for now
}

/**
 * Get helmet icon CSS classes for styling
 */
export function getTeamHelmetClasses(
  isWinning: boolean = false,
  isEliminated: boolean = false
): string {
  const baseClasses = "w-8 h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm";
  const eliminatedClasses = isEliminated ? "opacity-50 bg-gray-400" : "bg-gray-300";
  const winningClasses = isWinning ? "ring-2 ring-green-500" : "";
  
  return `${baseClasses} ${eliminatedClasses} ${winningClasses}`;
}

/**
 * Get conference helmet CSS classes
 */
export function getConferenceHelmetClasses(): string {
  return "w-6 h-6 flex items-center justify-center";
}

/**
 * Get NFL logo CSS classes
 */
export function getNFLLogoClasses(): string {
  return "w-12 h-12 flex items-center justify-center";
} 