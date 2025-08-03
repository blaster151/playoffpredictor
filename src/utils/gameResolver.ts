import { TeamStanding } from '../types/nfl';

interface GameResolution {
  homeScore: number;
  awayScore: number;
  winner: string;
  confidence: number; // 0-1, how confident the algorithm is
}

interface TeamStats {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  strength: number; // Calculated team strength
}

export class GameResolver {
  private static readonly BASE_SCORE_RANGE = { min: 10, max: 35 };
  private static readonly CLOSE_GAME_THRESHOLD = 0.15; // 15% difference threshold for close games
  private static readonly RANDOMNESS_FACTOR = 0.5; // 50% randomness factor

  /**
   * Resolve a single game based on team records and randomness
   */
  static resolveGame(
    homeTeamId: string,
    awayTeamId: string,
    standings: TeamStanding[],
    seed?: number
  ): GameResolution {
    const homeTeam = standings.find(s => s.team.id === homeTeamId);
    const awayTeam = standings.find(s => s.team.id === awayTeamId);

    if (!homeTeam || !awayTeam) {
      // Fallback if teams not found in standings
      return this.generateRandomGame(homeTeamId, awayTeamId, seed);
    }

    const homeStats = this.calculateTeamStats(homeTeam);
    const awayStats = this.calculateTeamStats(awayTeam);

    // Calculate win probability based on team strength
    const homeAdvantage = 0.03; // 3% home field advantage
    const homeWinProbability = this.calculateWinProbability(homeStats, awayStats, homeAdvantage);

    // Add multiple layers of randomness for better distribution
    const randomFactor1 = this.getRandomFactor(seed);
    const randomFactor2 = this.getRandomFactor(seed ? seed + 1000 : undefined);
    const randomFactor3 = this.getRandomFactor(seed ? seed + 2000 : undefined);
    
    // Combine multiple random factors
    const combinedRandomFactor = (randomFactor1 + randomFactor2 + randomFactor3) / 3;
    const adjustedProbability = this.adjustProbabilityWithRandomness(homeWinProbability, combinedRandomFactor);

    // Determine winner with additional coin flip for close games
    const strengthDifference = Math.abs(homeStats.strength - awayStats.strength);
    const isCloseGame = strengthDifference < 0.1; // Close game threshold
    
    let homeWins: boolean;
    if (isCloseGame) {
      // For close games, add extra randomness
      const coinFlip = this.getRandomFactor(seed ? seed + 5000 : undefined);
      homeWins = coinFlip > 0.5;
    } else {
      homeWins = adjustedProbability > 0.5;
    }
    
    const winner = homeWins ? homeTeamId : awayTeamId;

    // Generate realistic scores
    const scores = this.generateRealisticScores(homeStats, awayStats, homeWins, seed);

    // Calculate confidence based on team strength difference
    const confidence = Math.max(0.3, 1 - (strengthDifference * 0.5));

    return {
      homeScore: scores.home,
      awayScore: scores.away,
      winner,
      confidence,
    };
  }

  /**
   * Calculate team statistics for game resolution
   */
  private static calculateTeamStats(standing: TeamStanding): TeamStats {
    const { record } = standing;
    const totalGames = record.wins + record.losses + record.ties;
    const winPercentage = totalGames > 0 ? record.wins / totalGames : 0.5;

    // Calculate team strength based on win percentage and point differential
    const avgPointsFor = totalGames > 0 ? record.pointsFor / totalGames : 20;
    const avgPointsAgainst = totalGames > 0 ? record.pointsAgainst / totalGames : 20;
    const pointDifferential = avgPointsFor - avgPointsAgainst;

    // Strength formula: 50% win percentage + 30% point differential + 20% base strength
    const strength = (winPercentage * 0.5) + 
                    (Math.max(0, pointDifferential / 10) * 0.3) + 
                    0.2;

    return {
      teamId: standing.team.id,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      pointsFor: record.pointsFor,
      pointsAgainst: record.pointsAgainst,
      winPercentage,
      strength: Math.max(0.1, Math.min(0.9, strength)), // Clamp between 0.1 and 0.9
    };
  }

  /**
   * Calculate win probability based on team strengths
   */
  private static calculateWinProbability(homeStats: TeamStats, awayStats: TeamStats, homeAdvantage: number): number {
    const strengthDifference = homeStats.strength - awayStats.strength;
    
    // Use logistic function to convert strength difference to probability
    const baseProbability = 1 / (1 + Math.exp(-strengthDifference * 4));
    
    // Apply home field advantage
    const adjustedProbability = baseProbability + homeAdvantage;
    
    return Math.max(0.1, Math.min(0.9, adjustedProbability));
  }

  /**
   * Adjust probability with randomness factor
   */
  private static adjustProbabilityWithRandomness(baseProbability: number, randomFactor: number): number {
    const randomness = (randomFactor - 0.5) * this.RANDOMNESS_FACTOR;
    const adjusted = baseProbability + randomness;
    return Math.max(0.1, Math.min(0.9, adjusted));
  }

  /**
   * Generate realistic scores based on team stats
   */
  private static generateRealisticScores(
    homeStats: TeamStats,
    awayStats: TeamStats,
    homeWins: boolean,
    seed?: number
  ): { home: number; away: number } {
    const random = this.getSeededRandom(seed);
    
    // NFL score frequency distribution (percentages)
    const scoreDistribution = [
      { score: 0, frequency: 0.88 },
      { score: 1, frequency: 0.17 },
      { score: 2, frequency: 0.17 },
      { score: 3, frequency: 2.11 },
      { score: 4, frequency: 0.01 },
      { score: 5, frequency: 0.35 },
      { score: 6, frequency: 0.8 },
      { score: 7, frequency: 1.75 },
      { score: 8, frequency: 0.35 },
      { score: 9, frequency: 1.6 },
      { score: 10, frequency: 4.91 },
      { score: 11, frequency: 0.35 },
      { score: 12, frequency: 0.88 },
      { score: 13, frequency: 2.63 },
      { score: 14, frequency: 4.39 },
      { score: 15, frequency: 1.05 },
      { score: 16, frequency: 2.44 },
      { score: 17, frequency: 7.72 },
      { score: 18, frequency: 1.05 },
      { score: 19, frequency: 1.23 },
      { score: 20, frequency: 7.63 },
      { score: 21, frequency: 4.04 },
      { score: 22, frequency: 1.93 },
      { score: 23, frequency: 5.26 },
      { score: 24, frequency: 7.54 },
      { score: 25, frequency: 0.88 },
      { score: 26, frequency: 2.46 },
      { score: 27, frequency: 4.73 },
      { score: 28, frequency: 3.16 },
      { score: 29, frequency: 1.86 },
      { score: 30, frequency: 2.28 },
      { score: 31, frequency: 6.84 },
      { score: 32, frequency: 1.40 },
      { score: 33, frequency: 1.06 },
      { score: 34, frequency: 2.81 },
      { score: 35, frequency: 1.58 },
      { score: 36, frequency: 1.05 },
      { score: 37, frequency: 2.81 },
      { score: 38, frequency: 1.76 },
      { score: 39, frequency: 0.35 },
      { score: 40, frequency: 0.17 },
      { score: 41, frequency: 1.16 },
      { score: 42, frequency: 0.3 },
      { score: 43, frequency: 0.2 },
      { score: 44, frequency: 0.1 },
      { score: 45, frequency: 0.05 },
    ];

    // Generate scores using weighted random selection
    const homeScore = this.getWeightedRandomScore(scoreDistribution, random);
    const awayScore = this.getWeightedRandomScore(scoreDistribution, random);

    // Ensure the winner matches the predicted outcome
    let finalHomeScore = homeScore;
    let finalAwayScore = awayScore;

    if (homeWins && finalHomeScore <= finalAwayScore) {
      // Home team should win, so adjust scores if needed
      finalHomeScore = finalAwayScore + this.getWeightedRandomScore(scoreDistribution, random);
    } else if (!homeWins && finalAwayScore <= finalHomeScore) {
      // Away team should win, so adjust scores if needed
      finalAwayScore = finalHomeScore + this.getWeightedRandomScore(scoreDistribution, random);
    }

    return {
      home: finalHomeScore,
      away: finalAwayScore,
    };
  }

  /**
   * Get a weighted random score based on NFL frequency distribution
   */
  private static getWeightedRandomScore(scoreDistribution: Array<{ score: number; frequency: number }>, random: () => number): number {
    const rand = random() * 100; // Convert to percentage
    let cumulativeFrequency = 0;
    
    for (const { score, frequency } of scoreDistribution) {
      cumulativeFrequency += frequency;
      if (rand <= cumulativeFrequency) {
        return score;
      }
    }
    
    // Fallback to a reasonable score if something goes wrong
    return 20;
  }

  /**
   * Generate auto-win scores for a specific team
   */
  static generateAutoWinScores(
    winningTeamId: string,
    homeTeamId: string,
    awayTeamId: string,
    seed?: number
  ): { homeScore: number; awayScore: number } {
    const random = this.getSeededRandom(seed);
    
    // NFL score frequency distribution (percentages)
    const scoreDistribution = [
      { score: 0, frequency: 0.88 },
      { score: 1, frequency: 0.17 },
      { score: 2, frequency: 0.17 },
      { score: 3, frequency: 2.11 },
      { score: 4, frequency: 0.01 },
      { score: 5, frequency: 0.35 },
      { score: 6, frequency: 0.8 },
      { score: 7, frequency: 1.75 },
      { score: 8, frequency: 0.35 },
      { score: 9, frequency: 1.6 },
      { score: 10, frequency: 4.91 },
      { score: 11, frequency: 0.35 },
      { score: 12, frequency: 0.88 },
      { score: 13, frequency: 2.63 },
      { score: 14, frequency: 4.39 },
      { score: 15, frequency: 1.05 },
      { score: 16, frequency: 2.44 },
      { score: 17, frequency: 7.72 },
      { score: 18, frequency: 1.05 },
      { score: 19, frequency: 1.23 },
      { score: 20, frequency: 7.63 },
      { score: 21, frequency: 4.04 },
      { score: 22, frequency: 1.93 },
      { score: 23, frequency: 5.26 },
      { score: 24, frequency: 7.54 },
      { score: 25, frequency: 0.88 },
      { score: 26, frequency: 2.46 },
      { score: 27, frequency: 4.73 },
      { score: 28, frequency: 3.16 },
      { score: 29, frequency: 1.86 },
      { score: 30, frequency: 2.28 },
      { score: 31, frequency: 6.84 },
      { score: 32, frequency: 1.40 },
      { score: 33, frequency: 1.06 },
      { score: 34, frequency: 2.81 },
      { score: 35, frequency: 1.58 },
      { score: 36, frequency: 1.05 },
      { score: 37, frequency: 2.81 },
      { score: 38, frequency: 1.76 },
      { score: 39, frequency: 0.35 },
      { score: 40, frequency: 0.17 },
      { score: 41, frequency: 1.16 },
      { score: 42, frequency: 0.3 },
      { score: 43, frequency: 0.2 },
      { score: 44, frequency: 0.1 },
      { score: 45, frequency: 0.05 },
    ];

    // Generate two random scores
    const score1 = this.getWeightedRandomScore(scoreDistribution, random);
    const score2 = this.getWeightedRandomScore(scoreDistribution, random);

    // Ensure the winning team has the higher score
    const isHomeTeamWinning = winningTeamId === homeTeamId;
    
    if (isHomeTeamWinning) {
      return {
        homeScore: Math.max(score1, score2),
        awayScore: Math.min(score1, score2)
      };
    } else {
      return {
        homeScore: Math.min(score1, score2),
        awayScore: Math.max(score1, score2)
      };
    }
  }

  /**
   * Generate a completely random game (fallback)
   */
  private static generateRandomGame(homeTeamId: string, awayTeamId: string, seed?: number): GameResolution {
    const random = this.getSeededRandom(seed);
    
    const homeScore = Math.round(this.BASE_SCORE_RANGE.min + random() * (this.BASE_SCORE_RANGE.max - this.BASE_SCORE_RANGE.min));
    const awayScore = Math.round(this.BASE_SCORE_RANGE.min + random() * (this.BASE_SCORE_RANGE.max - this.BASE_SCORE_RANGE.min));
    
    return {
      homeScore,
      awayScore,
      winner: homeScore > awayScore ? homeTeamId : awayTeamId,
      confidence: 0.3, // Low confidence for random games
    };
  }

  /**
   * Get random factor for game resolution
   */
  private static getRandomFactor(seed?: number): number {
    return this.getSeededRandom(seed)();
  }

  /**
   * Create a seeded random number generator
   */
  private static getSeededRandom(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }

    // Better seeded random number generator with more entropy
    let currentSeed = seed;
    return () => {
      // Use a more complex algorithm for better randomness
      currentSeed = (currentSeed * 1664525 + 1013904223) % 0x100000000;
      return (currentSeed & 0x7fffffff) / 0x7fffffff;
    };
  }

  /**
   * Resolve multiple games for a week
   */
  static resolveWeekGames(
    games: Array<{ id: string; homeTeam: string; awayTeam: string; homeScore?: number; awayScore?: number }>,
    standings: TeamStanding[],
    weekNumber: number
  ): Array<{ gameId: string; homeScore: number; awayScore: number; winner: string; confidence: number }> {
    const resolvedGames: Array<{ gameId: string; homeScore: number; awayScore: number; winner: string; confidence: number }> = [];

    games.forEach((game, index) => {
      // Skip games that already have scores
      if (game.homeScore !== undefined && game.awayScore !== undefined) {
        return;
      }

      // Use complex but deterministic seed for better randomness distribution
      const seed = (weekNumber * 10000) + (index * 100) + (game.homeTeam.charCodeAt(0) + game.awayTeam.charCodeAt(0));
      const resolution = this.resolveGame(game.homeTeam, game.awayTeam, standings, seed);

      resolvedGames.push({
        gameId: game.id,
        homeScore: resolution.homeScore,
        awayScore: resolution.awayScore,
        winner: resolution.winner,
        confidence: resolution.confidence,
      });
    });

    return resolvedGames;
  }

  /**
   * Check if a week has unresolved games
   */
  static hasUnresolvedGames(games: Array<{ homeScore?: number; awayScore?: number }>): boolean {
    return games.some(game => game.homeScore === undefined || game.awayScore === undefined);
  }

  /**
   * Count unresolved games in a week
   */
  static countUnresolvedGames(games: Array<{ homeScore?: number; awayScore?: number }>): number {
    return games.filter(game => game.homeScore === undefined || game.awayScore === undefined).length;
  }
} 