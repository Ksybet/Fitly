const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const weightController = require('../weight/weight.controller');
const sleepController = require('../sleep/sleep.controller');
const {
	validateHistoryListQuery,
	validateEntryId,
} = require('./health.validators');
const {
	validateWeightEntryRequest,
} = require('../weight/weight.validators');
const {
	validateSleepEntryRequest,
} = require('../sleep/sleep.validators');

const router = express.Router();

router.use(authMiddleware);

router.get(
	'/weight',
	validateHistoryListQuery,
	weightController.listEntries,
);
router.post(
	'/weight',
	validateWeightEntryRequest,
	weightController.createEntry,
);
router.get(
	'/weight/:entryId',
	validateEntryId,
	weightController.getEntry,
);
router.patch(
	'/weight/:entryId',
	validateEntryId,
	validateWeightEntryRequest,
	weightController.updateEntry,
);
router.delete(
	'/weight/:entryId',
	validateEntryId,
	weightController.deleteEntry,
);

router.get(
	'/sleep',
	validateHistoryListQuery,
	sleepController.listEntries,
);
router.post(
	'/sleep',
	validateSleepEntryRequest,
	sleepController.createEntry,
);
router.patch(
	'/sleep/:entryId',
	validateEntryId,
	validateSleepEntryRequest,
	sleepController.updateEntry,
);
router.delete(
	'/sleep/:entryId',
	validateEntryId,
	sleepController.deleteEntry,
);

module.exports = router;
