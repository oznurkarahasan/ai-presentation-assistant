"""
File validation service for security and integrity checks.
"""
import hashlib
from pathlib import Path
from app.core.logger import logger
from app.core.exceptions import ValidationError

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf": [b"%PDF-"],  # PDF magic bytes
}

def validate_file_type(file_content: bytes, filename: str) -> str:
    """
    Validates file type using magic bytes (not just extension).
    
    Args:
        file_content: First 512 bytes of file
        filename: Original filename
        
    Returns:
        str: Detected MIME type
        
    Raises:
        ValidationError: If file type is not allowed
    """
    # Check magic bytes
    detected_mime = None
    for mime_type, magic_bytes_list in ALLOWED_MIME_TYPES.items():
        for magic_bytes in magic_bytes_list:
            if file_content.startswith(magic_bytes):
                detected_mime = mime_type
                break
        if detected_mime:
            break
    
    if not detected_mime:
        logger.warning(f"Invalid file type detected for {filename}")
        raise ValidationError(
            f"Invalid file type. Only PDF files are allowed. "
            f"The uploaded file does not appear to be a valid PDF."
        )
    
    logger.debug(f"File type validated: {detected_mime} for {filename}")
    return detected_mime

def calculate_file_hash(file_path: str) -> str:
    """
    Calculates SHA256 hash of a file for duplicate detection.
    
    Args:
        file_path: Path to the file
        
    Returns:
        str: SHA256 hexadecimal hash
    """
    sha256_hash = hashlib.sha256()
    
    with open(file_path, "rb") as f:
        # Read in chunks to handle large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    file_hash = sha256_hash.hexdigest()
    logger.debug(f"Calculated file hash: {file_hash[:16]}...")
    return file_hash
