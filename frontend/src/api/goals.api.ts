import httpClient from './httpClient';
import { unwrapData } from './response';
import type { Goal, GoalInput, SuccessEnvelope } from './contracts';

type GoalsData = {
	goals: Goal[];
};

export async function getGoals(): Promise<Goal[]> {
	const response =
		await httpClient.get<SuccessEnvelope<GoalsData>>('/goals');

	return unwrapData(response).goals;
}

export async function updateGoals(goals: GoalInput[]): Promise<Goal[]> {
	const response = await httpClient.put<SuccessEnvelope<GoalsData>>(
		'/goals',
		{ goals },
	);

	return unwrapData(response).goals;
}
