const {
	calculateElapsedSeconds,
	calculatePauseSeconds,
} = require('../../src/modules/workout-sessions/workout-session-time');

describe('workout session time', () => {
	const startedAt = new Date('2026-07-31T10:00:00.000Z');

	test('calculates active seconds without pauses', () => {
		expect(calculateElapsedSeconds({
			status: 'in_progress',
			startedAt,
			accumulatedPauseSeconds: 0,
		}, new Date('2026-07-31T10:17:00.999Z'))).toBe(1020);
	});

	test('excludes accumulated pauses from an active session', () => {
		expect(calculateElapsedSeconds({
			status: 'in_progress',
			startedAt,
			accumulatedPauseSeconds: 120,
		}, new Date('2026-07-31T10:17:00.000Z'))).toBe(900);
	});

	test('freezes elapsed seconds at pausedAt', () => {
		expect(calculateElapsedSeconds({
			status: 'paused',
			startedAt,
			pausedAt: new Date('2026-07-31T10:10:00.000Z'),
			accumulatedPauseSeconds: 60,
		}, new Date('2026-07-31T10:30:00.000Z'))).toBe(540);
	});

	test('returns stored terminal duration', () => {
		expect(calculateElapsedSeconds({
			status: 'completed',
			elapsedSeconds: 900,
		}, new Date())).toBe(900);
		expect(calculateElapsedSeconds({
			status: 'cancelled',
			elapsedSeconds: 300,
		}, new Date())).toBe(300);
	});

	test('rounds down and clamps negative clock differences', () => {
		expect(calculatePauseSeconds(
			new Date('2026-07-31T10:00:00.900Z'),
			new Date('2026-07-31T10:00:01.899Z'),
		)).toBe(0);
		expect(calculatePauseSeconds(
			new Date('2026-07-31T10:01:00.000Z'),
			new Date('2026-07-31T10:00:00.000Z'),
		)).toBe(0);
	});
});
