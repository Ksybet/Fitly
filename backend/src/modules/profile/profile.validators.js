const { ApiError } = require('../../utils/api-error');

function validateGetProfileRequest(req, res, next) {
	next();
}

function validateUpdateProfileRequest(req, res, next) {
	try {
		const { firstName, lastName, birthDate, gender, heightCm } = req.body;

		if (firstName !== undefined) {
			if (typeof firstName !== 'string') {
				throw new ApiError(400, 'firstName must be a string');
			}

			if (firstName.trim().length > 50) {
				throw new ApiError(400, 'firstName must be at most 50 characters');
			}
		}

		if (lastName !== undefined) {
			if (typeof lastName !== 'string') {
				throw new ApiError(400, 'lastName must be a string');
			}

			if (lastName.trim().length > 50) {
				throw new ApiError(400, 'lastName must be at most 50 characters');
			}
		}

		if (birthDate !== undefined && birthDate !== null) {
			if (typeof birthDate !== 'string') {
				throw new ApiError(400, 'birthDate must be a string');
			}

			const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;

			if (!birthDateRegex.test(birthDate)) {
				throw new ApiError(400, 'birthDate must be in YYYY-MM-DD format');
			}
		}

		if (gender !== undefined && gender !== null) {
			const allowedGenders = ['male', 'female', 'other'];

			if (typeof gender !== 'string') {
				throw new ApiError(400, 'gender must be a string');
			}

			if (!allowedGenders.includes(gender)) {
				throw new ApiError(400, 'gender must be one of: male, female, other');
			}
		}

		if (heightCm !== undefined && heightCm !== null) {
			if (typeof heightCm !== 'number' || Number.isNaN(heightCm)) {
				throw new ApiError(400, 'heightCm must be a number');
			}

			if (heightCm <= 0 || heightCm > 300) {
				throw new ApiError(400, 'heightCm must be between 1 and 300');
			}
		}

		next();
	} catch (error) {
		next(error);
	}
}

module.exports = {
	validateGetProfileRequest,
	validateUpdateProfileRequest,
};
