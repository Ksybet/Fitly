const settingsRepository = require('./settings.repository');

function getDateInTimeZone(timezone, now = new Date(Date.now())) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		calendar: 'iso8601',
		numberingSystem: 'latn',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const values = Object.fromEntries(
		parts
			.filter(part => part.type !== 'literal')
			.map(part => [part.type, part.value]),
	);

	return `${values.year}-${values.month}-${values.day}`;
}

async function getUserLocalDate(userId, now) {
	const timezone = await settingsRepository.getTimezoneByUserId(userId);
	return getDateInTimeZone(timezone, now);
}

module.exports = {
	getDateInTimeZone,
	getUserLocalDate,
};
