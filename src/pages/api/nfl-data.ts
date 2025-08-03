import { NextApiRequest, NextApiResponse } from 'next';
import { nflDataFetcher } from '../../utils/nflDataFetcher';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { type, teamId, year } = req.query;

    switch (type) {
      case 'teams':
        const teams = await nflDataFetcher.fetchTeams();
        return res.status(200).json({ teams });

      case 'schedule':
        const schedule = await nflDataFetcher.fetchSchedule(year as string || '2025');
        return res.status(200).json({ schedule });

      case 'roster':
        if (!teamId) {
          return res.status(400).json({ message: 'Team ID is required for roster' });
        }
        const roster = await nflDataFetcher.fetchRoster(teamId as string);
        return res.status(200).json({ roster });

      case 'stats':
        if (!teamId) {
          return res.status(400).json({ message: 'Team ID is required for stats' });
        }
        const stats = await nflDataFetcher.fetchTeamStats(teamId as string);
        return res.status(200).json({ stats });

      case 'refresh':
        await nflDataFetcher.refreshCache();
        return res.status(200).json({ message: 'Cache refreshed successfully' });

      default:
        return res.status(400).json({ message: 'Invalid type parameter' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 