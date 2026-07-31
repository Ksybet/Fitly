exports.up = pgm => {
	pgm.createIndex(
		'workout_sessions',
		['user_id', 'finished_at'],
		{
			name: 'idx_workout_sessions_user_completed_finished',
			where: "status = 'completed'",
		},
	);
};

exports.down = pgm => {
	pgm.dropIndex('workout_sessions', ['user_id', 'finished_at'], {
		name: 'idx_workout_sessions_user_completed_finished',
	});
};
