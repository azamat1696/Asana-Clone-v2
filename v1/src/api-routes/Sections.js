//validate middleware
const validate = require('../middlewares/validate');
const authenticate = require('../middlewares/authenticate');
const idChecker = require('../middlewares/idChecker');
// validation schema
const { createSectionValidation,updateSectionValidation } = require('../validations/Sections');
const express = require('express');
const router = express.Router();
const SectionController = require('../controllers/Section');

router.route('/:id').get(idChecker,authenticate, SectionController.index);
router.route('/').post(authenticate,validate(createSectionValidation), SectionController.create);
router.route('/:id').patch(idChecker,authenticate,validate(updateSectionValidation), SectionController.update);
router.route('/:id').delete(idChecker,authenticate, SectionController.deleteSection);

module.exports = {
    router,
    path: '/sections'
}

