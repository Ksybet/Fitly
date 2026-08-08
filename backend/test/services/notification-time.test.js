const {
	getZonedParts,
	localDateTimeToDate,
	nextWaterRun,
	nextSleepRun,
	activeDoNotDisturbEnd,
} = require('../../src/modules/notifications/notification-time');

describe('notification time calculations', () => {
	test('aligns water reminders to local midnight slots', () => {
		const next = nextWaterRun(
			new Date('2026-08-08T10:15:00.000Z'),
			'Europe/Istanbul',
			120,
		);

		expect(next.toISOString()).toBe('2026-08-08T11:00:00.000Z');
		expect(getZonedParts(next, 'Europe/Istanbul')).toMatchObject({
			hour: 14,
			minute: 0,
		});
	});

	test('resets the water slot grid at the next local midnight', () => {
		const next = nextWaterRun(
			new Date('2026-08-08T23:30:00.000Z'),
			'UTC',
			100,
		);

		expect(next.toISOString()).toBe('2026-08-09T00:00:00.000Z');
	});

	test('moves a nonexistent spring-forward slot to the compatible time', () => {
		const next = nextWaterRun(
			new Date('2026-03-29T00:50:00.000Z'),
			'Europe/Berlin',
			60,
		);

		expect(next.toISOString()).toBe('2026-03-29T01:00:00.000Z');
		expect(getZonedParts(next, 'Europe/Berlin')).toMatchObject({
			hour: 3,
			minute: 0,
		});
	});

	test('chooses the earlier instant for an ambiguous fall-back time', () => {
		const value = localDateTimeToDate({
			year: 2026,
			month: 10,
			day: 25,
			hour: 2,
			minute: 30,
			second: 0,
		}, 'Europe/Berlin');

		expect(value.toISOString()).toBe('2026-10-25T00:30:00.000Z');
	});

	test('schedules sleep at the next local reminder time', () => {
		expect(nextSleepRun(
			new Date('2026-08-08T18:00:00.000Z'),
			'Europe/Istanbul',
			'22:30',
		).toISOString()).toBe('2026-08-08T19:30:00.000Z');

		expect(nextSleepRun(
			new Date('2026-08-08T20:00:00.000Z'),
			'Europe/Istanbul',
			'22:30',
		).toISOString()).toBe('2026-08-09T19:30:00.000Z');
	});

	test('resolves sleep time through the spring DST gap', () => {
		const next = nextSleepRun(
			new Date('2026-03-28T23:00:00.000Z'),
			'Europe/Berlin',
			'02:30',
		);

		expect(next.toISOString()).toBe('2026-03-29T01:30:00.000Z');
		expect(getZonedParts(next, 'Europe/Berlin')).toMatchObject({
			hour: 3,
			minute: 30,
		});
	});

	test('returns the local end of an overnight DND interval', () => {
		const end = activeDoNotDisturbEnd(
			new Date('2026-08-08T20:30:00.000Z'),
			'Europe/Istanbul',
			'22:00',
			'07:00',
		);

		expect(end.toISOString()).toBe('2026-08-09T04:00:00.000Z');
		expect(activeDoNotDisturbEnd(
			new Date('2026-08-08T10:00:00.000Z'),
			'Europe/Istanbul',
			'22:00',
			'07:00',
		)).toBeNull();
	});

	test('keeps the DND end correct across a DST transition', () => {
		const end = activeDoNotDisturbEnd(
			new Date('2026-03-29T00:30:00.000Z'),
			'Europe/Berlin',
			'22:00',
			'03:30',
		);

		expect(end.toISOString()).toBe('2026-03-29T01:30:00.000Z');
	});
});
