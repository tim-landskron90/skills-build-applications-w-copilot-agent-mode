import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; focus: string; reason: string };
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  return (
    <CapabilityCard<WorkoutResponse>
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      endpoint={`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`}
      emptyText="No workout suggestions are available."
      renderContent={({ suggestions }) => suggestions.length > 0 && (
        <ul>{suggestions.map((suggestion) => (
          <li key={suggestion.title}>
            <strong>{suggestion.title}</strong> ({suggestion.focus}): {suggestion.reason}
          </li>
        ))}</ul>
      )}
    />
  );
}
