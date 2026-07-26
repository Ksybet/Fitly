const { randomUUID } = require('crypto');

function createRequestId() {
	return `req_${randomUUID().replaceAll('-', '')}`;
}

function requestContextMiddleware(req, res, next) {
	const requestId = createRequestId();

	req.requestId = requestId;
	res.locals.requestId = requestId;

	next();
}

module.exports = {
	createRequestId,
	requestContextMiddleware,
};
