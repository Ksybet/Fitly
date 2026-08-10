const formatterCache = new Map();

function formatterFor(timezone) {
	if (!formatterCache.has(timezone)) {
		formatterCache.set(timezone, new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			calendar: 'iso8601',
			numberingSystem: 'latn',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		}));
	}
	return formatterCache.get(timezone);
}

function getZonedParts(value, timezone) {
	const date = value instanceof Date ? value : new Date(value);
	const entries = formatterFor(timezone)
		.formatToParts(date)
		.filter(part => part.type !== 'literal')
		.map(part => [part.type, Number(part.value)]);
	return Object.fromEntries(entries);
}

function partsEpoch(parts) {
	return Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour ?? 0,
		parts.minute ?? 0,
		parts.second ?? 0,
	);
}

function sameLocalMinute(left, right) {
	return left.year === right.year
		&& left.month === right.month
		&& left.day === right.day
		&& left.hour === right.hour
		&& left.minute === right.minute;
}

function offsetAt(value, timezone) {
	const date = value instanceof Date ? value : new Date(value);
	const epochWithoutMilliseconds = Math.floor(date.getTime() / 1000) * 1000;
	return partsEpoch(getZonedParts(date, timezone)) - epochWithoutMilliseconds;
}

function localDateTimeToDate(parts, timezone) {
	const naiveEpoch = partsEpoch(parts);
	const offsets = new Set([
		offsetAt(new Date(naiveEpoch - 36 * 60 * 60 * 1000), timezone),
		offsetAt(new Date(naiveEpoch), timezone),
		offsetAt(new Date(naiveEpoch + 36 * 60 * 60 * 1000), timezone),
	]);
	const candidates = [...offsets]
		.map(offset => new Date(naiveEpoch - offset));
	const exact = candidates
		.filter(candidate => sameLocalMinute(
			getZonedParts(candidate, timezone),
			parts,
		))
		.sort((left, right) => left.getTime() - right.getTime());
	if (exact.length > 0) {
		return exact[0];
	}

	// During a spring-forward gap, use the compatible post-transition time.
	const afterGap = candidates
		.map(candidate => ({
			candidate,
			localEpoch: partsEpoch(getZonedParts(candidate, timezone)),
		}))
		.filter(item => item.localEpoch > naiveEpoch)
		.sort((left, right) => left.localEpoch - right.localEpoch);
	if (afterGap.length > 0) {
		return afterGap[0].candidate;
	}

	throw new RangeError(`Unable to resolve local time in ${timezone}`);
}

function addLocalDays(parts, days) {
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
	};
}

function nextWaterRun(now, timezone, intervalMinutes) {
	if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1) {
		throw new TypeError('intervalMinutes must be a positive integer');
	}
	const current = getZonedParts(now, timezone);
	const minuteOfDay = current.hour * 60 + current.minute;
	let nextMinute = (Math.floor(minuteOfDay / intervalMinutes) + 1)
		* intervalMinutes;
	let date = current;
	if (nextMinute >= 1440) {
		date = addLocalDays(current, 1);
		nextMinute = 0;
	}

	return localDateTimeToDate({
		...date,
		hour: Math.floor(nextMinute / 60),
		minute: nextMinute % 60,
		second: 0,
	}, timezone);
}

function parseTime(value) {
	if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
		throw new TypeError('time must use HH:mm format');
	}
	const [hour, minute] = value.split(':').map(Number);
	return { hour, minute };
}

function nextSleepRun(now, timezone, reminderTime) {
	const currentDate = getZonedParts(now, timezone);
	const time = parseTime(reminderTime);
	let candidate = localDateTimeToDate({
		year: currentDate.year,
		month: currentDate.month,
		day: currentDate.day,
		...time,
		second: 0,
	}, timezone);
	if (candidate.getTime() <= new Date(now).getTime()) {
		candidate = localDateTimeToDate({
			...addLocalDays(currentDate, 1),
			...time,
			second: 0,
		}, timezone);
	}
	return candidate;
}

function activeDoNotDisturbEnd(now, timezone, from, to) {
	const current = getZonedParts(now, timezone);
	const fromTime = parseTime(from);
	const toTime = parseTime(to);
	const minute = current.hour * 60 + current.minute;
	const fromMinute = fromTime.hour * 60 + fromTime.minute;
	const toMinute = toTime.hour * 60 + toTime.minute;

	if (fromMinute === toMinute) {
		return localDateTimeToDate({
			...addLocalDays(current, 1),
			...toTime,
			second: 0,
		}, timezone);
	}

	const overnight = fromMinute > toMinute;
	const active = overnight
		? minute >= fromMinute || minute < toMinute
		: minute >= fromMinute && minute < toMinute;
	if (!active) {
		return null;
	}

	const endDate = overnight && minute >= fromMinute
		? addLocalDays(current, 1)
		: current;
	return localDateTimeToDate({
		...endDate,
		...toTime,
		second: 0,
	}, timezone);
}

module.exports = {
	getZonedParts,
	offsetAt,
	localDateTimeToDate,
	addLocalDays,
	nextWaterRun,
	parseTime,
	nextSleepRun,
	activeDoNotDisturbEnd,
};
