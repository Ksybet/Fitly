const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const ADMIN_FOOD_QUERY_FIELDS = new Set([
	'query',
	'active',
	'page',
	'pageSize',
]);
const FOOD_PRODUCT_FIELDS = new Set([
	'name',
	'nutritionPer100g',
	'isActive',
]);
const NUTRITION_FIELDS = new Set([
	'calories',
	'proteinG',
	'fatG',
	'carbsG',
]);

function parsePositiveInteger(value, field, defaultValue, maximum, details) {
	if (value === undefined) {
		return defaultValue;
	}

	if (
		typeof value !== 'string'
		|| !/^[1-9]\d*$/.test(value)
		|| Number(value) > maximum
	) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be an integer between 1 and ${maximum}`,
		);
		return defaultValue;
	}

	return Number(value);
}

function validateAdminFoodQuery(req, res, next) {
	const details = [];

	for (const field of Object.keys(req.query)) {
		if (!ADMIN_FOOD_QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let query;
	if (req.query.query !== undefined) {
		if (
			typeof req.query.query !== 'string'
			|| Array.from(req.query.query).length > 100
		) {
			addDetail(
				details,
				'query',
				'INVALID_LENGTH',
				'query must be a string with at most 100 characters',
			);
		} else {
			query = req.query.query.trim();
		}
	}

	let active;
	if (req.query.active !== undefined) {
		if (req.query.active !== 'true' && req.query.active !== 'false') {
			addDetail(details, 'active', 'INVALID_TYPE', 'active must be a boolean');
		} else {
			active = req.query.active === 'true';
		}
	}

	const page = parsePositiveInteger(
		req.query.page,
		'page',
		1,
		2147483647,
		details,
	);
	const pageSize = parsePositiveInteger(
		req.query.pageSize,
		'pageSize',
		20,
		100,
		details,
	);

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.adminFoodQuery = { query, active, page, pageSize };
	return next();
}

function validateAdminFoodProductId(req, res, next) {
	const value = req.params.productId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'productId',
				code: 'OUT_OF_RANGE',
				message: 'productId must be a positive integer',
			}],
		}));
	}

	req.adminFoodProductId = Number(value);
	return next();
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateNutritionValues(value, details) {
	if (!isPlainObject(value)) {
		addDetail(
			details,
			'nutritionPer100g',
			'INVALID_TYPE',
			'nutritionPer100g must be an object',
		);
		return;
	}

	for (const field of Object.keys(value)) {
		if (!NUTRITION_FIELDS.has(field)) {
			addDetail(
				details,
				`nutritionPer100g.${field}`,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	for (const field of NUTRITION_FIELDS) {
		const path = `nutritionPer100g.${field}`;

		if (!Object.prototype.hasOwnProperty.call(value, field)) {
			addDetail(details, path, 'REQUIRED', `${field} is required`);
		} else if (
			typeof value[field] !== 'number'
			|| !Number.isFinite(value[field])
			|| value[field] < 0
		) {
			addDetail(
				details,
				path,
				'OUT_OF_RANGE',
				`${field} must be a non-negative finite number`,
			);
		}
	}
}

function validateFoodProductFields(body, details) {
	if (body.name !== undefined) {
		if (typeof body.name !== 'string') {
			addDetail(details, 'name', 'INVALID_TYPE', 'name must be a string');
		} else {
			const length = Array.from(body.name.trim()).length;

			if (length < 1 || length > 200) {
				addDetail(
					details,
					'name',
					'INVALID_LENGTH',
					'name must contain between 1 and 200 characters',
				);
			}
		}
	}

	if (body.nutritionPer100g !== undefined) {
		validateNutritionValues(body.nutritionPer100g, details);
	}

	if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
		addDetail(
			details,
			'isActive',
			'INVALID_TYPE',
			'isActive must be a boolean',
		);
	}
}

function foodProductBodyValidator({ partial }) {
	return (req, res, next) => {
		const details = [];
		const validBody = validateObjectBody(req.body, {
			allowedFields: FOOD_PRODUCT_FIELDS,
			requiredFields: partial ? [] : ['name', 'nutritionPer100g'],
			minProperties: partial ? 1 : 0,
		}, details);

		if (validBody) {
			validateFoodProductFields(req.body, details);
		}

		if (details.length > 0) {
			return next(new ApiError(400, 'Request validation failed', { details }));
		}

		const normalized = {};
		if (req.body.name !== undefined) {
			normalized.name = req.body.name.trim();
		}
		if (req.body.nutritionPer100g !== undefined) {
			normalized.nutritionPer100g = req.body.nutritionPer100g;
		}
		if (req.body.isActive !== undefined || !partial) {
			normalized.isActive = req.body.isActive ?? true;
		}

		req.adminFoodBody = normalized;
		return next();
	};
}

const validateCreateFoodProduct = foodProductBodyValidator({ partial: false });
const validateUpdateFoodProduct = foodProductBodyValidator({ partial: true });

module.exports = {
	validateAdminFoodQuery,
	validateAdminFoodProductId,
	validateCreateFoodProduct,
	validateUpdateFoodProduct,
};
