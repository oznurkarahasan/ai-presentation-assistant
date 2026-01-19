import sys
from loguru import logger
from pathlib import Path
from app.core.config import settings

# Create logs directory
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Remove default handler
logger.remove()

# Environment-based configuration
is_production = settings.ENV.lower() in ["production", "prod"]

# Check if logging is enabled
if settings.ENABLE_LOGGING:
    # Console output (always enabled when logging is on)
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
        colorize=True
    )

    # File output configuration based on environment
    if is_production:
        # Production: Conservative logging
        logger.add(
            "logs/app.log",
            rotation="20 MB",
            retention="7 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=settings.LOG_LEVEL,
            backtrace=True,
            diagnose=False
        )
        
        logger.add(
            "logs/error.log",
            rotation="10 MB",
            retention="14 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level="ERROR",
            backtrace=True,
            diagnose=False
        )
    else:
        # Development: Verbose logging
        logger.add(
            "logs/app.log",
            rotation="100 MB",
            retention="30 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=settings.LOG_LEVEL,
            backtrace=True,
            diagnose=True
        )
        
        logger.add(
            "logs/error.log",
            rotation="50 MB",
            retention="60 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level="ERROR",
            backtrace=True,
            diagnose=True
        )

    # Log startup configuration
    logger.info(f"Logger initialized for {settings.ENV.upper()} environment with level {settings.LOG_LEVEL}")

__all__ = ["logger"]
