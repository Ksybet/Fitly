function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addDetail(details, field, code, message) {
	details.push({ field, code, message });
}

function validateObjectBody(body, {
	allowedFields,
	requiredFields = [],
	minProperties = 0,
}, details) {
	if (!isPlainObject(body)) {
		addDetail(details, 'body', 'INVALID_TYPE', 'Request body must be an object');
		return false;
	}

	for (const field of Object.keys(body)) {
		if (!allowedFields.has(field)) {
			addDetail(
				details,
				field,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	for (const field of requiredFields) {
		if (!Object.prototype.hasOwnProperty.call(body, field)) {
			addDetail(details, field, 'REQUIRED', `${field} is required`);
		}
	}

	if (Object.keys(body).length < minProperties) {
		addDetail(
			details,
			'body',
			'MIN_PROPERTIES',
			`Request body must contain at least ${minProperties} field`,
		);
	}

	return true;
}

function isRfc3339DateTime(value) {
	if (
		typeof value !== 'string'
		|| !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
	) {
		return false;
	}

	return !Number.isNaN(Date.parse(value));
}

module.exports = {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
};
