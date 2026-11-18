import { useEffect, useState } from 'react';
import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((data) => setActivities(data.activities))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." loading={loading} error={error} empty={activities.length === 0} emptyText="No activities recorded">
      <ul>{activities.map((activity, index) => <li key={index}>{activity.type} - {activity.minutes} minutes - {activity.points} points</li>)}</ul>
    </CapabilityCard>
  );
}
