const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const PRODUCT_FIELDS = new Set(['name', 'nutritionPer100g', 'isActive']);
const NUTRITION_FIELDS = new Set(['calories', 'proteinG', 'fatG', 'carbsG']);
const PRODUCT_SCOPES = new Set(['all', 'system', 'custom']);

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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

function validatePaginationQuery(query, allowedFields, details) {
	for (const field of Object.keys(query)) {
		if (!allowedFields.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	return {
		page: parsePositiveInteger(query.page, 'page', 1, 2147483647, details),
		pageSize: parsePositiveInteger(query.pageSize, 'pageSize', 20, 100, details),
	};
}

function validateNutritionValues(value, field, details) {
	if (!isPlainObject(value)) {
		addDetail(details, field, 'INVALID_TYPE', `${field} must be an object`);
		return;
	}

	for (const key of Object.keys(value)) {
		if (!NUTRITION_FIELDS.has(key)) {
			addDetail(
				details,
				`${field}.${key}`,
				'UNKNOWN_FIELD',
				`${key} is not allowed`,
			);
		}
	}

	for (const key of NUTRITION_FIELDS) {
		const path = `${field}.${key}`;

		if (!Object.prototype.hasOwnProperty.call(value, key)) {
			addDetail(details, path, 'REQUIRED', `${key} is required`);
		} else if (
			typeof value[key] !== 'number'
			|| !Number.isFinite(value[key])
			|| value[key] < 0
		) {
			addDetail(
				details,
				path,
				'OUT_OF_RANGE',
				`${key} must be a non-negative finite number`,
			);
		}
	}
}

function validateProductSearchQuery(req, res, next) {
	const details = [];
	const pagination = validatePaginationQuery(
		req.query,
		new Set(['query', 'scope', 'page', 'pageSize']),
		details,
	);
	let query;
	let scope = 'all';

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

	if (req.query.scope !== undefined) {
		if (
			typeof req.query.scope !== 'string'
			|| !PRODUCT_SCOPES.has(req.query.scope)
		) {
			addDetail(
				details,
				'scope',
				'INVALID_ENUM',
				'scope has an unsupported value',
			);
		} else {
			scope = req.query.scope;
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.nutritionQuery = {
		...pagination,
		query,
		scope,
	};
	return next();
}

function validateCreateProductRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: PRODUCT_FIELDS,
		requiredFields: ['name', 'nutritionPer100g'],
	}, details)) {
		if (Object.prototype.hasOwnProperty.call(body, 'name')) {
			if (typeof body.name !== 'string') {
				addDetail(details, 'name', 'INVALID_TYPE', 'name must be a string');
			} else {
				const name = body.name.trim();
				const length = Array.from(name).length;

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

		if (Object.prototype.hasOwnProperty.call(body, 'nutritionPer100g')) {
			validateNutritionValues(
				body.nutritionPer100g,
				'nutritionPer100g',
				details,
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'isActive')
			&& typeof body.isActive !== 'boolean'
		) {
			addDetail(
				details,
				'isActive',
				'INVALID_TYPE',
				'isActive must be a boolean',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.nutritionBody = {
		name: body.name.trim(),
		nutritionPer100g: body.nutritionPer100g,
		isActive: body.isActive ?? true,
	};
	return next();
}

module.exports = {
	validateProductSearchQuery,
	validateCreateProductRequest,
	validatePaginationQuery,
	validateNutritionValues,
};
