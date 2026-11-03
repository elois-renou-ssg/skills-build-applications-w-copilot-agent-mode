import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = { _id?: string; title: string; focus?: string; reason?: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    const userEmail = encodeURIComponent('mona@example.com');
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${userEmail}`)
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {hasError ? (
          <p role="alert">Unable to load workout suggestions.</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p role="status">No workout suggestions yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {suggestions.map((workout, index) => (
              <li className="list-group-item px-0" key={workout._id ?? `${workout.title}-${index}`}>
                <strong>{workout.title}</strong>
                {workout.focus && <div>{workout.focus}</div>}
                {workout.reason && <p className="mb-0">{workout.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
