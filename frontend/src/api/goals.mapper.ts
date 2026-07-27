import type { Goal, GoalInput } from './contracts';

export type ManagedGoals = {
	stepsGoal: number | null;
	calorieGoal: number | null;
	weightGoal: number | null;
	sleepGoalHours: number | null;
	waterGoal: number | null;
};

export type ManagedGoalInput = {
	stepsGoal?: string | number | null;
	calorieGoal?: string | number | null;
	weightGoal?: string | number | null;
	sleepGoalHours?: string | number | null;
	waterGoal?: string | number | null;
};

const GOAL_TITLES = {
	steps: 'Цель по шагам',
	calories: 'Цель по калориям',
	weight: 'Целевой вес',
	sleep: 'Цель сна',
	water: 'Цель по воде',
} as const;

type ManagedGoalKey = keyof ManagedGoals;

export function isActiveGoal(goal: Goal): boolean {
	return goal.status === 'created' || goal.status === 'in_progress';
}

function getManagedGoalKey(goal: Goal): ManagedGoalKey | null {
	if (goal.goalType === 'steps') return 'stepsGoal';
	if (goal.goalType === 'water') return 'waterGoal';

	if (goal.goalType === 'custom') {
		if (goal.title === GOAL_TITLES.calories) return 'calorieGoal';
		if (goal.title === GOAL_TITLES.weight) return 'weightGoal';
		if (goal.title === GOAL_TITLES.sleep) return 'sleepGoalHours';
	}

	return null;
}

function getManagedValue(goal: Goal, key: ManagedGoalKey): number {
	const value = Number(goal.targetValue);

	if (key === 'waterGoal') {
		return goal.unit === 'ml' ? value / 1000 : value;
	}

	if (key === 'sleepGoalHours') {
		return goal.unit === 'minutes' ? value / 60 : value;
	}

	return value;
}

export function mapGoalsToManaged(goals: Goal[]): ManagedGoals {
	const result: ManagedGoals = {
		stepsGoal: null,
		calorieGoal: null,
		weightGoal: null,
		sleepGoalHours: null,
		waterGoal: null,
	};

	for (const goal of goals) {
		if (!isActiveGoal(goal)) continue;

		const key = getManagedGoalKey(goal);
		if (!key || result[key] !== null) continue;

		const value = getManagedValue(goal, key);
		result[key] = Number.isFinite(value) && value > 0 ? value : null;
	}

	return result;
}

function toGoalInput(goal: Goal): GoalInput {
	return {
		goalType: goal.goalType,
		title: goal.title,
		targetValue: goal.targetValue,
		unit: goal.unit,
		...(goal.startsOn ? { startsOn: goal.startsOn } : {}),
		...(goal.endsOn !== undefined ? { endsOn: goal.endsOn } : {}),
	};
}

export function getPassthroughGoals(goals: Goal[]): GoalInput[] {
	return goals
		.filter(goal => isActiveGoal(goal) && !getManagedGoalKey(goal))
		.map(toGoalInput);
}

function positiveNumber(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null;

	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}

export function buildManagedGoals(input: ManagedGoalInput): GoalInput[] {
	const goals: GoalInput[] = [];
	const steps = positiveNumber(input.stepsGoal);
	const calories = positiveNumber(input.calorieGoal);
	const weight = positiveNumber(input.weightGoal);
	const sleepHours = positiveNumber(input.sleepGoalHours);
	const waterLiters = positiveNumber(input.waterGoal);

	if (steps !== null) {
		goals.push({
			goalType: 'steps',
			title: GOAL_TITLES.steps,
			targetValue: steps,
			unit: 'steps',
		});
	}

	if (calories !== null) {
		goals.push({
			goalType: 'custom',
			title: GOAL_TITLES.calories,
			targetValue: calories,
			unit: 'custom',
		});
	}

	if (weight !== null) {
		goals.push({
			goalType: 'custom',
			title: GOAL_TITLES.weight,
			targetValue: weight,
			unit: 'kg',
		});
	}

	if (sleepHours !== null) {
		goals.push({
			goalType: 'custom',
			title: GOAL_TITLES.sleep,
			targetValue: Math.round(sleepHours * 60),
			unit: 'minutes',
		});
	}

	if (waterLiters !== null) {
		goals.push({
			goalType: 'water',
			title: GOAL_TITLES.water,
			targetValue: Math.round(waterLiters * 1000),
			unit: 'ml',
		});
	}

	return goals;
}
