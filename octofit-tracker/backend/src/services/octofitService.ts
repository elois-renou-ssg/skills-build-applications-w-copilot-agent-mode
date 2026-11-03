import { isValidObjectId } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length === 0) {
    throw httpError('Activity request body is required', 400);
  }
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    typeof teamId !== 'string' ||
    !isValidObjectId(userId) ||
    !isValidObjectId(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw httpError('Activity requires valid userId, teamId, type, and positive minutes', 400);
  }
  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw httpError('Activity user or team was not found', 404);
  }
  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError('Team request body is required', 400);
  }
  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw httpError('Team name is required', 400);
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0 || !Array.isArray(members)) {
    throw httpError('Team mascot and members must be valid', 400);
  }
  if (members.some((member) => typeof member !== 'string' || !isValidObjectId(member))) {
    throw httpError('Team members must be valid user IDs', 400);
  }
  const memberIds = [...new Set(members as string[])];
  if (memberIds.length > 0 && await User.countDocuments({ _id: { $in: memberIds } }) !== memberIds.length) {
    throw httpError('One or more team members were not found', 404);
  }
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw httpError('User was not found', 404);

  const [workouts, recentActivities] = await Promise.all([
    Workout.find().lean(),
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
  ]);
  const latestActivity = recentActivities[0];
  const activityFocus = latestActivity
    ? ({ run: 'endurance', cycle: 'endurance', walk: 'endurance', strength: 'strength' }[latestActivity.type.toLowerCase()] ?? latestActivity.type)
    : undefined;
  const preferredFocus = workouts.some((workout) => workout.focus === user.fitnessGoal)
    ? user.fitnessGoal
    : activityFocus;

  return workouts
    .sort((left, right) => Number(right.focus === preferredFocus) - Number(left.focus === preferredFocus))
    .map((workout) => ({
      ...workout,
      reason: workout.focus === user.fitnessGoal
        ? `Matches your ${user.fitnessGoal} fitness goal.`
        : workout.focus === activityFocus && latestActivity
          ? `Builds on your recent ${latestActivity.type} activity.`
          : `Recommended to support your ${user.fitnessGoal} fitness goal.`,
    }));
}

export { User };
