function getResponseMeta(res) {
	return {
		requestId: res.locals.requestId,
	};
}

function sendSuccess(res, data, options = {}) {
	const {
		status = 200,
		message,
		meta,
	} = options;
	const body = {
		success: true,
	};

	if (data !== undefined) {
		body.data = data;
	}

	if (message !== undefined) {
		body.message = message;
	}

	body.meta = {
		...meta,
		...getResponseMeta(res),
	};

	return res.status(status).json(body);
}

function sendActionCompleted(res, options = {}) {
	return sendSuccess(res, { completed: true }, options);
}

function sendDeleted(res, options = {}) {
	return sendSuccess(res, { deleted: true }, options);
}

module.exports = {
	sendSuccess,
	sendActionCompleted,
	sendDeleted,
};
