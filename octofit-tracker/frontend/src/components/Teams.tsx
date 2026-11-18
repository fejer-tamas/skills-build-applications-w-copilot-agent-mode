import { useEffect, useState } from 'react';
import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." loading={loading} error={error} empty={teams.length === 0} emptyText="No teams found">
      <ul>{teams.map((team, index) => <li key={index}>{team.name} - {team.members?.length ?? 0} members</li>)}</ul>
    </CapabilityCard>
  );
}
