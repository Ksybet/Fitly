const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const FAVORITE_FIELDS = new Set(['water', 'weight', 'height', 'bmi']);

function validateUpdateFavoritesRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: FAVORITE_FIELDS,
	}, details)) {
		for (const field of FAVORITE_FIELDS) {
			if (
				Object.prototype.hasOwnProperty.call(body, field)
				&& typeof body[field] !== 'boolean'
			) {
				addDetail(
					details,
					field,
					'INVALID_TYPE',
					`${field} must be a boolean`,
				);
			}
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = { validateUpdateFavoritesRequest };
