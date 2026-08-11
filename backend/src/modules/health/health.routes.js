const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const weightController = require('../weight/weight.controller');
const sleepController = require('../sleep/sleep.controller');
const waterController = require('../water/water.controller');
const dailyController = require('../daily/daily.controller');
const {
	validateHistoryListQuery,
	validateDateRange,
	validateEntryId,
	validateDatePath,
} = require('./health.validators');
const {
	validateWeightEntryRequest,
} = require('../weight/weight.validators');
const {
	validateSleepEntryRequest,
} = require('../sleep/sleep.validators');
const {
	validateWaterEntryRequest,
} = require('../water/water.validators');
const {
	validateStepsRequest,
} = require('../daily/daily.validators');

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

router.get(
	'/water',
	validateHistoryListQuery,
	waterController.listEntries,
);
router.post(
	'/water',
	validateWaterEntryRequest,
	waterController.createEntry,
);
router.patch(
	'/water/:entryId',
	validateEntryId,
	validateWaterEntryRequest,
	waterController.updateEntry,
);
router.delete(
	'/water/:entryId',
	validateEntryId,
	waterController.deleteEntry,
);

router.get(
	'/steps',
	validateDateRange,
	dailyController.listSteps,
);
router.put(
	'/steps/:date',
	validateDatePath,
	validateStepsRequest,
	dailyController.updateSteps,
);

module.exports = router;
