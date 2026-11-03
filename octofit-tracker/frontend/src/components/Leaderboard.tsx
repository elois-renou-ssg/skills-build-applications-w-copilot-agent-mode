import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<Entry[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => {
        if (active) setLeaderboard(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {hasError ? (
          <p role="alert">Unable to load leaderboard.</p>
        ) : leaderboard === null ? (
          <p role="status">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p role="status">No leaderboard scores yet.</p>
        ) : (
          <ol className="list-group list-group-numbered list-group-flush">
            {leaderboard.map((entry) => (
              <li className="list-group-item d-flex justify-content-between px-0" key={entry.rank}>
                <span>{entry.teamName}</span>
                <strong>{entry.totalPoints} points</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
