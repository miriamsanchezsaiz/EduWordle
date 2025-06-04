// src/utils/ApiError.js


class ApiError extends Error {
  
  constructor(statusCode, message, isOperational = true, details = []) {
    super(message); 
    this.statusCode = statusCode;
    this.isOperational = isOperational; 
    this.details = details; 
    Error.captureStackTrace(this, this.constructor);
  }

  // --- Static factory methods for common error types ---

  
  static badRequest(message, details = []) {
    return new ApiError(400, message, true, details);
  }


  static unauthorized(message) {
    return new ApiError(401, message);
  }

  
  static forbidden(message) {
    return new ApiError(403, message);
  }

  
  static notFound(message) {
    return new ApiError(404, message);
  }

  
  static conflict(message) {
    return new ApiError(409, message);
  }


  static internal(message, details = []) {
    return new ApiError(500, message, false, details); 
  }
}

module.exports = ApiError;