const nutritionService = require('./nutrition.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function searchProducts(req, res, next) {
	try {
		const result = await nutritionService.searchProducts(
			currentUserId(req),
			req.nutritionQuery,
		);

		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function createCustomProduct(req, res, next) {
	try {
		const product = await nutritionService.createCustomProduct(
			currentUserId(req),
			req.nutritionBody,
		);

		return sendSuccess(res, product, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	searchProducts,
	createCustomProduct,
	currentUserId,
};
