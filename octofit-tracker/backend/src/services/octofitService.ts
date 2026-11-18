import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? input as Record<string, unknown> : {};
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = asRecord(input);
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const teamId = typeof body.teamId === 'string' ? body.teamId : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const minutes = typeof body.minutes === 'number' ? body.minutes : Number.NaN;

  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId)) {
    throw httpError(400, 'A valid userId and teamId are required');
  }
  if (!type || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError(400, 'Activity type and positive minutes are required');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user || !team) throw httpError(404, 'User or team not found');

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  const members = Array.isArray(body.members)
    ? body.members.filter((member): member is string => typeof member === 'string' && mongoose.isValidObjectId(member))
    : [];

  if (!name) throw httpError(400, 'Team name is required');
  if (!mascot) throw httpError(400, 'Team mascot is required');
  if (Array.isArray(body.members) && body.members.some((member) => typeof member !== 'string' || !mongoose.isValidObjectId(member))) {
    throw httpError(400, 'Team members must contain valid user IDs');
  }

  const existingMembers = await User.find({ _id: { $in: members } }).select('_id').lean();
  if (existingMembers.length !== members.length) throw httpError(404, 'One or more team members were not found');

  const team = await Team.create({ name, mascot, members });
  for (const memberId of members) {
    await User.updateOne({ _id: memberId }, { $set: { team: team._id } });
  }
  return team.toObject();
}

export async function getLeaderboard() {
  const activities = await Activity.find().select('team points').lean();
  const totals = new Map<string, number>();
  for (const activity of activities) {
    const teamId = activity.team.toString();
    totals.set(teamId, (totals.get(teamId) ?? 0) + (activity.points ?? 0));
  }

  const teams = await Team.find({ _id: { $in: [...totals.keys()] } }).lean();
  const ranked = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: totals.get(team._id.toString()) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return ranked;
}

export async function suggestWorkouts(userEmail: string) {
  const email = decodeURIComponent(userEmail).trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw httpError(404, 'User not found');

  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean();
  const activityType = recent[0]?.type?.toLowerCase();
  const focus = activityType === 'run' || activityType === 'cycle'
    ? 'endurance'
    : activityType === 'strength'
      ? 'strength'
      : typeof user.fitnessGoal === 'string'
        ? user.fitnessGoal.toLowerCase()
        : 'mobility';

  const workout = await Workout.findOne({ focus }).lean();
  if (!workout) {
    const fallback = await Workout.find().lean();
    return fallback.map((item) => ({
      ...item,
      reason: `Suggested from ${activityType ?? user.fitnessGoal ?? 'your'} activity pattern`,
    }));
  }

  return [{
    ...workout,
    reason: activityType
      ? `Matches your recent ${activityType} activity and ${focus} goal`
      : `Matches your ${focus} fitness goal`,
  }];
}

export { User };
