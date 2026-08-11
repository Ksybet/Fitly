const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const controller = require('./support.controller');
const {
	validateListQuery,
	validateRequestId,
	validateCreateRequest,
	validateMessage,
} = require('./support.validators');

const router = express.Router();

router.get('/requests', authMiddleware, validateListQuery, controller.listRequests);
router.post('/requests', authMiddleware, validateCreateRequest, controller.createRequest);
router.get('/requests/:requestId', authMiddleware, validateRequestId, controller.getRequest);
router.post('/requests/:requestId/messages', authMiddleware, validateRequestId, validateMessage, controller.addMessage);
router.post('/requests/:requestId/close', authMiddleware, validateRequestId, controller.closeRequest);

module.exports = router;
