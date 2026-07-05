const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const validate = require('../middleware/validate');
const { searchSchema } = require('../utils/validationSchemas');

// POST /api/search
router.post('/', validate(searchSchema), searchController.search);

module.exports = router;
