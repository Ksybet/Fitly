function secondsBetween(start, end) {
	const difference = new Date(end).getTime() - new Date(start).getTime();
	return Math.max(0, Math.floor(difference / 1000));
}

function calculatePauseSeconds(pausedAt, currentTime) {
	return secondsBetween(pausedAt, currentTime);
}

function calculateElapsedSeconds(session, currentTime) {
	if (['completed', 'cancelled'].includes(session.status)) {
		return Math.max(0, Number(session.elapsedSeconds) || 0);
	}

	const end = session.status === 'paused'
		? session.pausedAt
		: currentTime;
	const totalSeconds = secondsBetween(session.startedAt, end);
	const pauseSeconds = Math.max(
		0,
		Number(session.accumulatedPauseSeconds) || 0,
	);

	return Math.max(0, totalSeconds - pauseSeconds);
}

module.exports = {
	calculateElapsedSeconds,
	calculatePauseSeconds,
};
