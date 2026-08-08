exports.up = pgm => {
	pgm.addColumns('notifications', {
		delivery_queued_at: { type: 'timestamptz' },
		delivery_locked_until: { type: 'timestamptz' },
	});
	pgm.createIndex('notifications', ['delivery_queued_at', 'created_at'], {
		name: 'notifications_delivery_queue_idx',
		where: "delivery_queued_at IS NULL AND status IN ('created', 'scheduled')",
	});
};

exports.down = pgm => {
	pgm.dropIndex('notifications', ['delivery_queued_at', 'created_at'], {
		name: 'notifications_delivery_queue_idx',
	});
	pgm.dropColumns('notifications', [
		'delivery_queued_at',
		'delivery_locked_until',
	]);
};
