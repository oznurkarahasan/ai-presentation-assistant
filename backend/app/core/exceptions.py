"""
Custom exception classes for better error handling and logging.
"""

class AppBaseException(Exception):
    """Base exception for all custom exceptions"""
    def __init__(self, message: str, details: str = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class FileProcessingError(AppBaseException):
    """Raised when file upload or processing fails"""
    pass


class PDFExtractionError(AppBaseException):
    """Raised when PDF text extraction fails"""
    pass


class EmbeddingError(AppBaseException):
    """Raised when OpenAI embedding generation fails"""
    pass


class DatabaseError(AppBaseException):
    """Raised when database operations fail"""
    pass


class AuthenticationError(AppBaseException):
    """Raised when authentication fails"""
    pass


class ResourceNotFoundError(AppBaseException):
    """Raised when a requested resource is not found"""
    pass


class ValidationError(AppBaseException):
    """Raised when input validation fails"""
    pass


class RateLimitError(AppBaseException):
    """Raised when rate limit is exceeded"""
    pass
