import { useEffect, useState } from 'react';
import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then((data) => setEntries(data.leaderboard))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." loading={loading} error={error} empty={entries.length === 0} emptyText="No leaderboard rankings available">
      <ol>{entries.map((entry) => <li key={entry.rank}>{entry.teamName}: {entry.totalPoints}</li>)}</ol>
    </CapabilityCard>
  );
}
