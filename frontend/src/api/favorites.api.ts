import httpClient from './httpClient';
import { unwrapData } from './response';
import type { Favorites, SuccessEnvelope } from './contracts';

export async function getFavorites(): Promise<Favorites> {
	const response =
		await httpClient.get<SuccessEnvelope<Favorites>>('/favorites');

	return unwrapData(response);
}

export async function updateFavorites(
	favorites: Partial<Favorites>,
): Promise<Favorites> {
	const response = await httpClient.put<SuccessEnvelope<Favorites>>(
		'/favorites',
		favorites,
	);

	return unwrapData(response);
}
