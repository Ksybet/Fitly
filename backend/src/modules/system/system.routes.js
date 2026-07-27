const express = require('express');
const systemController = require('./system.controller');

const router = express.Router();

router.get('/health', systemController.getHealth);

module.exports = router;
