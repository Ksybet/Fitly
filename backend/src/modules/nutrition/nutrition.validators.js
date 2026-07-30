const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const PRODUCT_FIELDS = new Set(['name', 'nutritionPer100g', 'isActive']);
const NUTRITION_FIELDS = new Set(['calories', 'proteinG', 'fatG', 'carbsG']);
const PRODUCT_SCOPES = new Set(['all', 'system', 'custom']);
const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
const MEAL_FIELDS = new Set(['mealType', 'eatenAt', 'title', 'items']);
const CATALOG_ITEM_FIELDS = new Set(['productId', 'amountG']);
const MANUAL_ITEM_FIELDS = new Set([
	'name',
	'amountG',
	'nutritionPer100g',
]);

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

function isValidDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day;
}

function validateMealListQuery(req, res, next) {
	const details = [];
	const pagination = validatePaginationQuery(
		req.query,
		new Set(['from', 'to', 'mealType', 'page', 'pageSize']),
		details,
	);
	let from;
	let to;
	let mealType;

	for (const field of ['from', 'to']) {
		if (req.query[field] !== undefined) {
			if (!isValidDate(req.query[field])) {
				addDetail(
					details,
					field,
					'INVALID_DATE',
					`${field} must be a valid date in YYYY-MM-DD format`,
				);
			} else if (field === 'from') {
				from = req.query[field];
			} else {
				to = req.query[field];
			}
		}
	}

	if (from && to && from > to) {
		addDetail(
			details,
			'to',
			'INVALID_RANGE',
			'to must be greater than or equal to from',
		);
	}

	if (req.query.mealType !== undefined) {
		if (
			typeof req.query.mealType !== 'string'
			|| !MEAL_TYPES.has(req.query.mealType)
		) {
			addDetail(
				details,
				'mealType',
				'INVALID_ENUM',
				'mealType has an unsupported value',
			);
		} else {
			mealType = req.query.mealType;
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.nutritionQuery = {
		...pagination,
		from,
		to,
		mealType,
	};
	return next();
}

function validateMealId(req, res, next) {
	const value = req.params.mealId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'mealId',
				code: 'OUT_OF_RANGE',
				message: 'mealId must be a positive integer',
			}],
		}));
	}

	req.mealId = Number(value);
	return next();
}

function validateAmount(value, field, details) {
	if (
		typeof value !== 'number'
		|| !Number.isFinite(value)
		|| value < 0.1
		|| value > 10000
	) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be a number between 0.1 and 10000`,
		);
	}
}

function validateMealItem(item, index, details) {
	const path = `items[${index}]`;

	if (!isPlainObject(item)) {
		addDetail(details, path, 'INVALID_TYPE', 'Meal item must be an object');
		return null;
	}

	const hasProductId = Object.prototype.hasOwnProperty.call(item, 'productId');
	const hasManualData =
		Object.prototype.hasOwnProperty.call(item, 'name')
		|| Object.prototype.hasOwnProperty.call(item, 'nutritionPer100g');

	if (hasProductId === hasManualData) {
		addDetail(
			details,
			path,
			'ONE_OF',
			'Meal item must be either a catalog or manual item',
		);
		return null;
	}

	const allowedFields = hasProductId
		? CATALOG_ITEM_FIELDS
		: MANUAL_ITEM_FIELDS;
	const requiredFields = hasProductId
		? ['productId', 'amountG']
		: ['name', 'amountG', 'nutritionPer100g'];

	for (const field of Object.keys(item)) {
		if (!allowedFields.has(field)) {
			addDetail(
				details,
				`${path}.${field}`,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	for (const field of requiredFields) {
		if (!Object.prototype.hasOwnProperty.call(item, field)) {
			addDetail(
				details,
				`${path}.${field}`,
				'REQUIRED',
				`${field} is required`,
			);
		}
	}

	if (Object.prototype.hasOwnProperty.call(item, 'amountG')) {
		validateAmount(item.amountG, `${path}.amountG`, details);
	}

	if (hasProductId) {
		if (
			!Number.isInteger(item.productId)
			|| item.productId < 1
			|| item.productId > 2147483647
		) {
			addDetail(
				details,
				`${path}.productId`,
				'OUT_OF_RANGE',
				'productId must be a positive integer',
			);
		}

		return {
			productId: item.productId,
			amountG: item.amountG,
		};
	}

	let name;

	if (Object.prototype.hasOwnProperty.call(item, 'name')) {
		if (typeof item.name !== 'string') {
			addDetail(
				details,
				`${path}.name`,
				'INVALID_TYPE',
				'name must be a string',
			);
		} else {
			name = item.name.trim();
			const length = Array.from(name).length;

			if (length < 1 || length > 200) {
				addDetail(
					details,
					`${path}.name`,
					'INVALID_LENGTH',
					'name must contain between 1 and 200 characters',
				);
			}
		}
	}

	if (Object.prototype.hasOwnProperty.call(item, 'nutritionPer100g')) {
		validateNutritionValues(
			item.nutritionPer100g,
			`${path}.nutritionPer100g`,
			details,
		);
	}

	return {
		name,
		amountG: item.amountG,
		nutritionPer100g: item.nutritionPer100g,
	};
}

function validateMealRequest(req, res, next) {
	const details = [];
	const body = req.body;
	let items = [];

	if (validateObjectBody(body, {
		allowedFields: MEAL_FIELDS,
		requiredFields: ['mealType', 'eatenAt', 'items'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'mealType')
			&& (
				typeof body.mealType !== 'string'
				|| !MEAL_TYPES.has(body.mealType)
			)
		) {
			addDetail(
				details,
				'mealType',
				'INVALID_ENUM',
				'mealType has an unsupported value',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'eatenAt')
			&& !isRfc3339DateTime(body.eatenAt)
		) {
			addDetail(
				details,
				'eatenAt',
				'INVALID_DATE_TIME',
				'eatenAt must be a valid RFC 3339 date-time',
			);
		}

		if (Object.prototype.hasOwnProperty.call(body, 'title')) {
			if (
				typeof body.title !== 'string'
				|| Array.from(body.title).length > 200
			) {
				addDetail(
					details,
					'title',
					'INVALID_LENGTH',
					'title must be a string with at most 200 characters',
				);
			}
		}

		if (Object.prototype.hasOwnProperty.call(body, 'items')) {
			if (!Array.isArray(body.items)) {
				addDetail(
					details,
					'items',
					'INVALID_TYPE',
					'items must be an array',
				);
			} else {
				if (body.items.length < 1 || body.items.length > 50) {
					addDetail(
						details,
						'items',
						'INVALID_LENGTH',
						'items must contain between 1 and 50 elements',
					);
				}

				items = body.items.map(
					(item, index) => validateMealItem(item, index, details),
				);
			}
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.nutritionBody = {
		mealType: body.mealType,
		eatenAt: body.eatenAt,
		title: body.title === undefined ? null : body.title.trim(),
		items,
	};
	return next();
}

module.exports = {
	validateProductSearchQuery,
	validateCreateProductRequest,
	validateMealListQuery,
	validateMealId,
	validateMealRequest,
	validatePaginationQuery,
	validateNutritionValues,
};
