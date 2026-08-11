jest.mock('../../src/modules/diary/diary.service', () => ({
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	getEntry: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const diaryService = require('../../src/modules/diary/diary.service');
const { ApiError } = require('../../src/utils/api-error');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization(userId = 7) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function diaryEntry(overrides = {}) {
	return {
		id: 15,
		recordedAt: '2026-08-10T09:30:00.000Z',
		date: '2026-08-10',
		moodScore: 4,
		energyLevel: null,
		stressLevel: 2,
		tags: ['work'],
		symptoms: ['headache'],
		note: 'Feeling better',
		inputMethod: 'manual',
		createdAt: '2026-08-10T09:31:00.000Z',
		updatedAt: '2026-08-10T09:31:00.000Z',
		...overrides,
	};
}

describe('Diary HTTP contracts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('GET /diary/entries returns a filtered paginated list', async () => {
		diaryService.listEntries.mockResolvedValueOnce({
			items: [diaryEntry()],
			meta: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
		});

		await request(app)
			.get('/api/v1/diary/entries?from=2026-08-01&to=2026-08-10&moodScore=4&page=2&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toEqual({
					success: true,
					data: [diaryEntry()],
					meta: {
						page: 2,
						pageSize: 10,
						total: 11,
						totalPages: 2,
						requestId: expect.stringMatching(requestIdPattern),
					},
				});
			});

		expect(diaryService.listEntries).toHaveBeenCalledWith(7, {
			from: '2026-08-01',
			to: '2026-08-10',
			moodScore: 4,
			page: 2,
			pageSize: 10,
		});
	});

	test('POST /diary/entries creates and normalizes a full entry', async () => {
		diaryService.createEntry.mockResolvedValueOnce(diaryEntry());

		await request(app)
			.post('/api/v1/diary/entries')
			.set('Authorization', authorization())
			.send({
				recordedAt: '2026-08-10T12:30:00+03:00',
				moodScore: 4,
				energyLevel: 3,
				stressLevel: 2,
				tags: ['  work  ', 'health'],
				symptoms: [' headache '],
				note: 'Feeling better',
			})
			.expect(201)
			.expect(response => {
				expect(response.body.data).toEqual(diaryEntry());
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});

		expect(diaryService.createEntry).toHaveBeenCalledWith(7, {
			recordedAt: '2026-08-10T12:30:00+03:00',
			moodScore: 4,
			energyLevel: 3,
			stressLevel: 2,
			tags: ['work', 'health'],
			symptoms: ['headache'],
			note: 'Feeling better',
		});
	});

	test('POST /diary/entries applies defaults to a minimal entry', async () => {
		diaryService.createEntry.mockResolvedValueOnce(diaryEntry({
			energyLevel: null,
			stressLevel: null,
			tags: [],
			symptoms: [],
			note: null,
		}));

		await request(app)
			.post('/api/v1/diary/entries')
			.set('Authorization', authorization())
			.send({
				recordedAt: '2026-08-10T09:30:00Z',
				moodScore: 4,
			})
			.expect(201);

		expect(diaryService.createEntry).toHaveBeenCalledWith(7, {
			recordedAt: '2026-08-10T09:30:00Z',
			moodScore: 4,
			energyLevel: null,
			stressLevel: null,
			tags: [],
			symptoms: [],
			note: null,
		});
	});

	test('GET /diary/entries/:entryId returns an owned entry', async () => {
		diaryService.getEntry.mockResolvedValueOnce(diaryEntry());

		await request(app)
			.get('/api/v1/diary/entries/15')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data.id).toBe(15);
			});

		expect(diaryService.getEntry).toHaveBeenCalledWith(7, 15);
	});

	test('PATCH /diary/entries/:entryId updates only supplied fields', async () => {
		diaryService.updateEntry.mockResolvedValueOnce(diaryEntry({
			energyLevel: null,
			stressLevel: null,
			symptoms: [],
			note: null,
		}));
		const body = {
			energyLevel: null,
			stressLevel: null,
			symptoms: [],
			note: null,
		};

		await request(app)
			.patch('/api/v1/diary/entries/15')
			.set('Authorization', authorization())
			.send(body)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject(body);
			});

		expect(diaryService.updateEntry).toHaveBeenCalledWith(7, 15, body);
	});

	test('DELETE /diary/entries/:entryId returns the standard envelope', async () => {
		diaryService.deleteEntry.mockResolvedValueOnce();

		await request(app)
			.delete('/api/v1/diary/entries/15')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toEqual({
					success: true,
					data: { deleted: true },
					meta: { requestId: expect.stringMatching(requestIdPattern) },
				});
			});

		expect(diaryService.deleteEntry).toHaveBeenCalledWith(7, 15);
	});

	test.each([
		['get', '/api/v1/diary/entries/15', 'getEntry'],
		['patch', '/api/v1/diary/entries/15', 'updateEntry'],
		['delete', '/api/v1/diary/entries/15', 'deleteEntry'],
	])('%s returns 404 without exposing ownership', async (method, url, serviceMethod) => {
		diaryService[serviceMethod].mockRejectedValueOnce(
			new ApiError(404, 'Diary entry not found'),
		);

		const operation = request(app)[method](url).set('Authorization', authorization());
		if (method === 'patch') {
			operation.send({ note: 'Updated' });
		}

		await operation.expect(404);
	});

	test.each([
		[{}, 'recordedAt', 'REQUIRED'],
		[{ recordedAt: '2026-08-10', moodScore: 3 }, 'recordedAt', 'INVALID_DATE_TIME'],
		[{ recordedAt: '2026-08-10T12:00:00Z', moodScore: 0 }, 'moodScore', 'OUT_OF_RANGE'],
		[{
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 3,
			energyLevel: null,
		}, 'energyLevel', 'OUT_OF_RANGE'],
		[{
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 3,
			symptoms: ['headache', ' headache '],
		}, 'symptoms[1]', 'DUPLICATE_ITEM'],
		[{
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 3,
			symptoms: ['   '],
		}, 'symptoms[0]', 'INVALID_LENGTH'],
		[{
			recordedAt: '2026-08-10T12:00:00Z',
			moodScore: 3,
			inputMethod: 'voice',
		}, 'inputMethod', 'UNKNOWN_FIELD'],
	])('rejects an invalid create body', async (body, field, code) => {
		await request(app)
			.post('/api/v1/diary/entries')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field, code }),
				]));
			});
		expect(diaryService.createEntry).not.toHaveBeenCalled();
	});

	test('rejects more than twenty symptoms and an oversized note', async () => {
		const symptoms = Array.from({ length: 21 }, (_, index) => `symptom-${index}`);

		await request(app)
			.post('/api/v1/diary/entries')
			.set('Authorization', authorization())
			.send({
				recordedAt: '2026-08-10T12:00:00Z',
				moodScore: 3,
				symptoms,
				note: 'x'.repeat(5001),
			})
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field: 'symptoms', code: 'TOO_MANY_ITEMS' }),
					expect.objectContaining({ field: 'note', code: 'INVALID_LENGTH' }),
				]));
			});
	});

	test.each([
		[{}, 'body', 'MIN_PROPERTIES'],
		[{ moodScore: null }, 'moodScore', 'OUT_OF_RANGE'],
		[{ tags: null }, 'tags', 'INVALID_TYPE'],
		[{ unknown: true }, 'unknown', 'UNKNOWN_FIELD'],
	])('rejects an invalid partial update', async (body, field, code) => {
		await request(app)
			.patch('/api/v1/diary/entries/15')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field, code }),
				]));
			});
		expect(diaryService.updateEntry).not.toHaveBeenCalled();
	});

	test.each([
		['?from=2026-02-30', 'from', 'INVALID_DATE'],
		['?from=2026-08-10&to=2026-08-01', 'to', 'INVALID_RANGE'],
		['?moodScore=6', 'moodScore', 'OUT_OF_RANGE'],
		['?page=0', 'page', 'OUT_OF_RANGE'],
		['?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
		['?unknown=true', 'unknown', 'UNKNOWN_FIELD'],
	])('rejects invalid list query %s', async (query, field, code) => {
		await request(app)
			.get(`/api/v1/diary/entries${query}`)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field, code }),
				]));
			});
		expect(diaryService.listEntries).not.toHaveBeenCalled();
	});

	test.each(['0', 'abc', '9007199254740992'])(
		'rejects invalid entryId %s',
		async entryId => {
			await request(app)
				.get(`/api/v1/diary/entries/${entryId}`)
				.set('Authorization', authorization())
				.expect(400);
			expect(diaryService.getEntry).not.toHaveBeenCalled();
		},
	);

	test.each([
		['get', '/api/v1/diary/entries'],
		['post', '/api/v1/diary/entries'],
		['get', '/api/v1/diary/entries/15'],
		['patch', '/api/v1/diary/entries/15'],
		['delete', '/api/v1/diary/entries/15'],
	])('%s %s requires a valid access token', async (method, url) => {
		await request(app)[method](url).expect(401);
		await request(app)[method](url)
			.set('Authorization', 'Bearer invalid-token')
			.expect(401);
	});
});
