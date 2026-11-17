import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId: string;
  teamId: string;
  type: string;
  minutes: number;
};

type TeamInput = {
  name: string;
  mascot: string;
  members: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function parseActivityInput(input: unknown): ActivityInput {
  if (!isRecord(input)) throw httpError(400, 'Activity details are required');
  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw httpError(400, 'Valid userId and teamId are required');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw httpError(400, 'Activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError(400, 'Activity minutes must be a positive number');
  }
  return { userId, teamId, type: type.trim(), minutes };
}

function parseTeamInput(input: unknown): TeamInput {
  if (!isRecord(input)) throw httpError(400, 'Team details are required');
  const { name, mascot } = input;
  const members = input.members ?? [];
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw httpError(400, 'Team name is required');
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw httpError(400, 'Team mascot is required');
  }
  if (!Array.isArray(members)) throw httpError(400, 'Team members must be an array of user IDs');
  const memberIds = members.map((member: unknown) => {
    if (!isObjectId(member)) throw httpError(400, 'Team members must be valid user IDs');
    return member;
  });
  return { name: name.trim(), mascot: mascot.trim(), members: [...new Set(memberIds)] };
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const { userId, teamId, type, minutes } = parseActivityInput(input);
  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) throw httpError(404, 'The specified user or team was not found');
  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const { name, mascot, members } = parseTeamInput(input);
  if (members.length > 0) {
    const existingUsers = await User.countDocuments({ _id: { $in: members } });
    if (existingUsers !== members.length) throw httpError(400, 'Every team member must be an existing user');
  }
  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError(404, 'No user was found for that email address');

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const activityFocus = recentActivity
    ? ({ run: 'endurance', walk: 'endurance', cycle: 'endurance' }[recentActivity.type.toLowerCase()] ?? recentActivity.type.toLowerCase())
    : undefined;
  const focus = await Workout.exists({ focus: goalFocus }) ? goalFocus : activityFocus ?? goalFocus;
  const workouts = await Workout.find({ focus }).lean();
  const reason = recentActivity && focus === activityFocus
    ? `Recommended based on your recent ${recentActivity.type} activity and ${focus} focus.`
    : `Recommended to support your ${focus} goal.`;

  return workouts.map((workout) => ({
    ...workout,
    reason,
  }));
}

export { User };
