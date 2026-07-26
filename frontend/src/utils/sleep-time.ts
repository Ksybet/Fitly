export type SleepInterval = {
	sleepStart: string;
	sleepEnd: string;
	durationMinutes: number;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(value: string): { hours: number; minutes: number } {
	const match = TIME_PATTERN.exec(value);

	if (!match) {
		throw new Error('Время должно быть указано в формате ЧЧ:ММ');
	}

	return {
		hours: Number(match[1]),
		minutes: Number(match[2]),
	};
}

export function formatTimeFromIso(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	return `${String(date.getHours()).padStart(2, '0')}:${String(
		date.getMinutes(),
	).padStart(2, '0')}`;
}

export function createTodaySleepInterval(
	startTime: string,
	endTime: string,
	now = new Date(),
): SleepInterval {
	const start = parseTime(startTime);
	const end = parseTime(endTime);
	const sleepEnd = new Date(now);
	sleepEnd.setHours(end.hours, end.minutes, 0, 0);

	const sleepStart = new Date(now);
	sleepStart.setHours(start.hours, start.minutes, 0, 0);

	if (sleepStart >= sleepEnd) {
		sleepStart.setDate(sleepStart.getDate() - 1);
	}

	const durationMinutes = Math.round(
		(sleepEnd.getTime() - sleepStart.getTime()) / 60000,
	);

	if (durationMinutes < 1 || durationMinutes > 1440) {
		throw new Error('Продолжительность сна должна быть от 1 минуты до 24 часов');
	}

	return {
		sleepStart: sleepStart.toISOString(),
		sleepEnd: sleepEnd.toISOString(),
		durationMinutes,
	};
}

export function splitDuration(durationMinutes: number): {
	hours: number;
	minutes: number;
} {
	const safeDuration = Number.isFinite(durationMinutes)
		? Math.max(0, Math.round(durationMinutes))
		: 0;

	return {
		hours: Math.floor(safeDuration / 60),
		minutes: safeDuration % 60,
	};
}

export function getSleepQualityLabel(quality: number | null): string {
	const labels: Record<number, string> = {
		1: 'Очень плохо',
		2: 'Плохо',
		3: 'Нормально',
		4: 'Хорошо',
		5: 'Отлично',
	};

	return quality === null ? '' : labels[quality] ?? '';
}
