const service = require('./daily.service');

async function getToday(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const data = await service.getToday(userId);

		res.json({ success: true, data });
	} catch (e) {
		next(e);
	}
}

async function updateToday(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const data = await service.updateToday(userId, req.body);

		res.json({ success: true, data });
	} catch (e) {
		next(e);
	}
}

module.exports = {
	getToday,
	updateToday,
};
