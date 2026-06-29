// errorHandler.js — Global error handling middleware.
// Registered as the LAST middleware in index.js so it catches errors from all routes.
// Any controller can throw an error (or call next(err)) and it will land here.
//
// Express identifies a 4-argument middleware as an error handler — do not remove `next`.

const errorHandler = (err, req, res, next) => {
  // Log the full stack trace for debugging (only visible on the server, not sent to client)
  console.error(err.stack);

  // Use the statusCode attached to the error object if set by the controller,
  // otherwise default to 500 Internal Server Error
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
