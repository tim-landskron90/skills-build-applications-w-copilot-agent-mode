import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; mascot: string; members: string[] };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  return (
    <CapabilityCard<TeamResponse>
      title="Teams"
      description="Manage teams and members."
      endpoint="/api/teams"
      emptyText="No teams yet."
      renderContent={({ teams }) => teams.length > 0 && (
        <ul>{teams.map((team) => (
          <li key={team.name}>{team.name} ({team.mascot}) - {team.members.length} members</li>
        ))}</ul>
      )}
    />
  );
}
