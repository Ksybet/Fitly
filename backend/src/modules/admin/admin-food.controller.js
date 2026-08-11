const adminFoodService = require('./admin-food.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

async function listFoodProducts(req, res, next) {
	try {
		const result = await adminFoodService.listFoodProducts(req.adminFoodQuery);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getFoodProduct(req, res, next) {
	try {
		const product = await adminFoodService.getFoodProduct(
			req.adminFoodProductId,
		);
		return sendSuccess(res, product);
	} catch (error) {
		return next(error);
	}
}

async function createFoodProduct(req, res, next) {
	try {
		const product = await adminFoodService.createFoodProduct(
			req.adminFoodBody,
		);
		return sendSuccess(res, product, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateFoodProduct(req, res, next) {
	try {
		const product = await adminFoodService.updateFoodProduct(
			req.adminFoodProductId,
			req.adminFoodBody,
		);
		return sendSuccess(res, product);
	} catch (error) {
		return next(error);
	}
}

async function deleteFoodProduct(req, res, next) {
	try {
		await adminFoodService.deleteFoodProduct(req.adminFoodProductId);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listFoodProducts,
	getFoodProduct,
	createFoodProduct,
	updateFoodProduct,
	deleteFoodProduct,
};
