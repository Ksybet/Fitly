exports.up = pgm => {
	pgm.addConstraint('users', 'users_role_check', {
		check: "role IN ('user', 'admin')",
	});
};

exports.down = pgm => {
	pgm.dropConstraint('users', 'users_role_check');
};
