exports.up = pgm => {
	pgm.createTable('workouts', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		title: {
			type: 'varchar(200)',
			notNull: true,
		},
		description: {
			type: 'text',
			notNull: true,
		},
		type: {
			type: 'varchar(20)',
			notNull: true,
		},
		body_area: {
			type: 'varchar(20)',
			notNull: true,
		},
		intensity: {
			type: 'varchar(20)',
			notNull: true,
		},
		duration_minutes: {
			type: 'integer',
			notNull: true,
		},
		estimated_calories: {
			type: 'numeric(10, 2)',
			notNull: true,
		},
		image_url: {
			type: 'text',
		},
		is_active: {
			type: 'boolean',
			notNull: true,
			default: true,
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

	pgm.addConstraint('workouts', 'workouts_title_not_blank', {
		check: 'char_length(btrim(title)) > 0',
	});
	pgm.addConstraint('workouts', 'workouts_description_not_blank', {
		check: 'char_length(btrim(description)) > 0',
	});
	pgm.addConstraint('workouts', 'workouts_type_check', {
		check: "type IN ('cardio', 'strength', 'stretching', 'yoga')",
	});
	pgm.addConstraint('workouts', 'workouts_body_area_check', {
		check: "body_area IN ('abs', 'legs', 'back', 'arms', 'glutes', 'full_body')",
	});
	pgm.addConstraint('workouts', 'workouts_intensity_check', {
		check: "intensity IN ('low', 'medium', 'high')",
	});
	pgm.addConstraint('workouts', 'workouts_duration_check', {
		check: 'duration_minutes BETWEEN 5 AND 240',
	});
	pgm.addConstraint('workouts', 'workouts_calories_check', {
		check: 'estimated_calories >= 0 AND estimated_calories <= 5000',
	});
	pgm.createIndex(
		'workouts',
		['is_active', 'type', 'body_area', 'intensity'],
		{ name: 'workouts_catalog_idx' },
	);

	pgm.createTable('exercises', {
		id: {
			type: 'integer',
			primaryKey: true,
			sequenceGenerated: { precedence: 'BY DEFAULT' },
		},
		title: {
			type: 'varchar(200)',
			notNull: true,
		},
		description: {
			type: 'text',
			notNull: true,
		},
		type: {
			type: 'varchar(20)',
			notNull: true,
		},
		body_area: {
			type: 'varchar(20)',
			notNull: true,
		},
		intensity: {
			type: 'varchar(20)',
			notNull: true,
		},
		instructions: {
			type: 'jsonb',
			notNull: true,
		},
		media: {
			type: 'jsonb',
			notNull: true,
			default: pgm.func("'[]'::jsonb"),
		},
		is_active: {
			type: 'boolean',
			notNull: true,
			default: true,
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

	pgm.addConstraint('exercises', 'exercises_title_not_blank', {
		check: 'char_length(btrim(title)) > 0',
	});
	pgm.addConstraint('exercises', 'exercises_description_not_blank', {
		check: 'char_length(btrim(description)) > 0',
	});
	pgm.addConstraint('exercises', 'exercises_type_check', {
		check: "type IN ('cardio', 'strength', 'stretching', 'yoga')",
	});
	pgm.addConstraint('exercises', 'exercises_body_area_check', {
		check: "body_area IN ('abs', 'legs', 'back', 'arms', 'glutes', 'full_body')",
	});
	pgm.addConstraint('exercises', 'exercises_intensity_check', {
		check: "intensity IN ('low', 'medium', 'high')",
	});
	pgm.addConstraint('exercises', 'exercises_instructions_check', {
		check: "jsonb_typeof(instructions) = 'array' AND jsonb_array_length(instructions) > 0",
	});
	pgm.addConstraint('exercises', 'exercises_media_check', {
		check: "jsonb_typeof(media) = 'array'",
	});

	pgm.createTable('workout_exercises', {
		workout_id: {
			type: 'integer',
			notNull: true,
			references: 'workouts',
			onDelete: 'CASCADE',
		},
		exercise_id: {
			type: 'integer',
			notNull: true,
			references: 'exercises',
			onDelete: 'RESTRICT',
		},
		sort_order: {
			type: 'integer',
			notNull: true,
		},
		sets: {
			type: 'integer',
		},
		repetitions: {
			type: 'integer',
		},
		duration_seconds: {
			type: 'integer',
		},
		rest_seconds: {
			type: 'integer',
		},
	});

	pgm.addConstraint('workout_exercises', 'workout_exercises_pkey', {
		primaryKey: ['workout_id', 'exercise_id'],
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_order_unique', {
		unique: ['workout_id', 'sort_order'],
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_sort_order_check', {
		check: 'sort_order >= 1',
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_sets_check', {
		check: 'sets IS NULL OR sets BETWEEN 1 AND 100',
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_repetitions_check', {
		check: 'repetitions IS NULL OR repetitions BETWEEN 1 AND 10000',
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_duration_check', {
		check: 'duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 86400',
	});
	pgm.addConstraint('workout_exercises', 'workout_exercises_rest_check', {
		check: 'rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 3600',
	});

	pgm.sql(`
		INSERT INTO workouts (
			id,
			title,
			description,
			type,
			body_area,
			intensity,
			duration_minutes,
			estimated_calories,
			image_url
		)
		VALUES
			(
				1,
				'Силовая для рук',
				'Тренировка для укрепления рук, плеч и верхней части тела.',
				'strength',
				'arms',
				'medium',
				25,
				220,
				NULL
			),
			(
				2,
				'Растяжка для всего тела',
				'Мягкая тренировка для расслабления мышц и восстановления.',
				'stretching',
				'full_body',
				'low',
				15,
				50,
				NULL
			),
			(
				3,
				'Силовая для всего тела',
				'Комплексная силовая тренировка для основных групп мышц.',
				'strength',
				'full_body',
				'medium',
				25,
				220,
				NULL
			),
			(
				4,
				'Кардио для ног',
				'Активная тренировка для ног и выносливости.',
				'cardio',
				'legs',
				'high',
				27,
				260,
				NULL
			);

		INSERT INTO exercises (
			id,
			title,
			description,
			type,
			body_area,
			intensity,
			instructions,
			media
		)
		VALUES
			(
				1,
				'Отжимания',
				'Упражнение с собственным весом для рук, плеч и груди.',
				'strength',
				'arms',
				'medium',
				'[
					"Держите корпус ровно.",
					"Опускайтесь плавно.",
					"Не прогибайте поясницу.",
					"Не проваливайте плечи."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				2,
				'Планка на руках',
				'Статическое упражнение для мышц корпуса и плечевого пояса.',
				'strength',
				'abs',
				'medium',
				'[
					"Напрягите пресс.",
					"Удерживайте тело в прямой линии."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				3,
				'Сгибания рук',
				'Силовое упражнение для мышц рук.',
				'strength',
				'arms',
				'medium',
				'[
					"Выполняйте движение медленно.",
					"Контролируйте положение локтей."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				4,
				'Наклоны вперёд',
				'Упражнение для мягкой растяжки задней поверхности тела.',
				'stretching',
				'back',
				'low',
				'[
					"Тянитесь вниз без рывков.",
					"Расслабьте спину и шею."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				5,
				'Растяжка плеч',
				'Упражнение для растяжки плечевого пояса.',
				'stretching',
				'arms',
				'low',
				'[
					"Плавно тяните руку к противоположному плечу."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				6,
				'Поза ребёнка',
				'Восстанавливающая поза для расслабления спины и плеч.',
				'yoga',
				'back',
				'low',
				'[
					"Опуститесь на колени.",
					"Вытяните руки вперёд.",
					"Расслабьтесь."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				7,
				'Приседания',
				'Силовое упражнение для мышц ног и ягодиц.',
				'strength',
				'legs',
				'medium',
				'[
					"Держите спину ровно.",
					"Направляйте колени по линии стоп."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				8,
				'Планка',
				'Статическое упражнение для укрепления мышц корпуса.',
				'strength',
				'abs',
				'medium',
				'[
					"Напрягите пресс.",
					"Не поднимайте таз слишком высоко."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				9,
				'Бег на месте',
				'Кардиоупражнение для развития выносливости.',
				'cardio',
				'legs',
				'high',
				'[
					"Двигайтесь активно.",
					"Помогайте себе руками."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				10,
				'Прыжки',
				'Кардиоупражнение для ног и координации.',
				'cardio',
				'legs',
				'high',
				'[
					"Приземляйтесь мягко.",
					"Не блокируйте колени."
				]'::jsonb,
				'[]'::jsonb
			),
			(
				11,
				'Выпады',
				'Динамическое упражнение для мышц ног и ягодиц.',
				'cardio',
				'legs',
				'high',
				'[
					"Следите, чтобы колено не уходило далеко за носок."
				]'::jsonb,
				'[]'::jsonb
			);

		INSERT INTO workout_exercises (
			workout_id,
			exercise_id,
			sort_order,
			sets,
			repetitions,
			duration_seconds,
			rest_seconds
		)
		VALUES
			(1, 1, 1, 3, 10, NULL, NULL),
			(1, 2, 2, 3, NULL, 30, NULL),
			(1, 3, 3, 3, 12, NULL, NULL),
			(2, 4, 1, NULL, NULL, 120, NULL),
			(2, 5, 2, NULL, NULL, 120, NULL),
			(2, 6, 3, NULL, NULL, 180, NULL),
			(3, 7, 1, 3, 12, NULL, NULL),
			(3, 1, 2, 3, 10, NULL, NULL),
			(3, 8, 3, 3, NULL, 30, NULL),
			(4, 9, 1, NULL, NULL, 180, NULL),
			(4, 10, 2, 3, NULL, 30, NULL),
			(4, 11, 3, 3, 10, NULL, NULL);

		SELECT setval(
			pg_get_serial_sequence('workouts', 'id'),
			(SELECT MAX(id) FROM workouts),
			TRUE
		);
		SELECT setval(
			pg_get_serial_sequence('exercises', 'id'),
			(SELECT MAX(id) FROM exercises),
			TRUE
		);
	`);
};

exports.down = pgm => {
	pgm.dropTable('workout_exercises');
	pgm.dropTable('exercises');
	pgm.dropTable('workouts');
};
