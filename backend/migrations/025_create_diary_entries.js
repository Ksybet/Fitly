exports.up = pgm => {
	pgm.createTable('diary_entries', {
		id: {
			type: 'bigint',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		user_id: {
			type: 'integer',
			notNull: true,
			references: 'users',
			onDelete: 'CASCADE',
		},
		recorded_at: { type: 'timestamptz', notNull: true },
		mood_score: { type: 'smallint', notNull: true },
		energy_level: { type: 'smallint' },
		stress_level: { type: 'smallint' },
		tags: {
			type: 'text[]',
			notNull: true,
			default: pgm.func("'{}'::text[]"),
		},
		symptoms: {
			type: 'text[]',
			notNull: true,
			default: pgm.func("'{}'::text[]"),
		},
		note: { type: 'text' },
		input_method: {
			type: 'varchar(10)',
			notNull: true,
			default: 'manual',
		},
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
		updated_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP'),
		},
	});

	pgm.addConstraint('diary_entries', 'diary_entries_mood_score_check', {
		check: 'mood_score BETWEEN 1 AND 5',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_energy_level_check', {
		check: 'energy_level IS NULL OR energy_level BETWEEN 1 AND 5',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_stress_level_check', {
		check: 'stress_level IS NULL OR stress_level BETWEEN 1 AND 5',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_tags_count_check', {
		check: 'cardinality(tags) <= 20',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_symptoms_count_check', {
		check: 'cardinality(symptoms) <= 20',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_note_length_check', {
		check: 'note IS NULL OR char_length(note) <= 5000',
	});
	pgm.addConstraint('diary_entries', 'diary_entries_input_method_check', {
		check: "input_method IN ('manual', 'voice')",
	});
	pgm.createIndex(
		'diary_entries',
		[
			{ name: 'user_id' },
			{ name: 'recorded_at', sort: 'DESC' },
			{ name: 'id', sort: 'DESC' },
		],
		{ name: 'diary_entries_user_recorded_idx' },
	);
};

exports.down = pgm => pgm.dropTable('diary_entries');
