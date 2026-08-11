const express = require('express');
const adminCatalogController = require('./admin-catalog.controller');
const {
	validateAdminCatalogQuery,
	validateExerciseId,
	validateCreateExercise,
	validateUpdateExercise,
} = require('./admin-catalog.validators');

const router = express.Router();

router.get(
	'/exercises',
	validateAdminCatalogQuery,
	adminCatalogController.listExercises,
);
router.post(
	'/exercises',
	validateCreateExercise,
	adminCatalogController.createExercise,
);
router.get(
	'/exercises/:exerciseId',
	validateExerciseId,
	adminCatalogController.getExercise,
);
router.patch(
	'/exercises/:exerciseId',
	validateExerciseId,
	validateUpdateExercise,
	adminCatalogController.updateExercise,
);
router.delete(
	'/exercises/:exerciseId',
	validateExerciseId,
	adminCatalogController.deleteExercise,
);

module.exports = router;
