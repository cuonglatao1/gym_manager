// middleware/asyncHandler.js
/**
 * Async error handler middleware
 * Wraps async functions to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;