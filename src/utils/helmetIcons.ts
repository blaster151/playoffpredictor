// Utility functions for helmet and logo paths
export function getTeamHelmetPath(teamId: string): string {
  return `/icons/${teamId.toLowerCase()}-helmet.png`;
}

export function getTeamHelmetFlippedPath(teamId: string): string {
  return `/icons/${teamId.toLowerCase()}-helmet-flipped.png`;
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