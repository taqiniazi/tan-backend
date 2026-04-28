const { z } = require('zod');
const logger = require('../utils/logger');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    logger.error('Validation error: %o', issues);
    
    return res.status(400).json({
      error: 'Validation failed',
      details: issues.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    });
  }
};

module.exports = validate;
