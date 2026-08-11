const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const diaryController = require('./diary.controller');
const {
	validateDiaryListQuery,
	validateDiaryEntryId,
	validateCreateDiaryEntryRequest,
	validateUpdateDiaryEntryRequest,
} = require('./diary.validators');

const router = express.Router();

router.get(
	'/entries',
	authMiddleware,
	validateDiaryListQuery,
	diaryController.listEntries,
);
router.post(
	'/entries',
	authMiddleware,
	validateCreateDiaryEntryRequest,
	diaryController.createEntry,
);
router.get(
	'/entries/:entryId',
	authMiddleware,
	validateDiaryEntryId,
	diaryController.getEntry,
);
router.patch(
	'/entries/:entryId',
	authMiddleware,
	validateDiaryEntryId,
	validateUpdateDiaryEntryRequest,
	diaryController.updateEntry,
);
router.delete(
	'/entries/:entryId',
	authMiddleware,
	validateDiaryEntryId,
	diaryController.deleteEntry,
);

module.exports = router;
