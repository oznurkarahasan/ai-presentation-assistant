"""
File cleanup service for managing old uploaded files.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.models.presentation import Presentation, PresentationStatus
from app.core.logger import logger
import os

CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60  # once a day
FAILED_UPLOAD_RETENTION_DAYS = 7

async def cleanup_old_files(
    db: AsyncSession,
    failed_days: int = 7,
    dry_run: bool = False
) -> dict:
    """
    Cleans up old presentation files from disk and database.
    ONLY removes:
    - Failed uploads older than failed_days
    - Expired guest uploads (based on expires_at)
    - User uploads are NEVER deleted automatically
    
    Args:
        db: Database session
        failed_days: Remove failed uploads older than this (default: 7 days)
        dry_run: If True, only report what would be deleted without deleting
        
    Returns:
        dict: Statistics about cleanup operation
    """
    stats = {
        "checked": 0,
        "deleted_files": 0,
        "deleted_records": 0,
        "freed_bytes": 0,
        "errors": 0
    }
    
    now = datetime.now(timezone.utc)
    failed_threshold = now - timedelta(days=failed_days)
    
    # Query 1: Old failed uploads
    failed_query = select(Presentation).where(
        and_(
            Presentation.created_at < failed_threshold,
            Presentation.status == PresentationStatus.FAILED
        )
    )
    
    failed_result = await db.execute(failed_query)
    failed_presentations = failed_result.scalars().all()
    
    # Query 2: Expired guest uploads
    guest_query = select(Presentation).where(
        and_(
            Presentation.is_guest_upload == True,
            Presentation.expires_at < now
        )
    )
    
    guest_result = await db.execute(guest_query)
    expired_guests = guest_result.scalars().all()
    
    presentations_to_delete = list(failed_presentations) + list(expired_guests)
    stats["checked"] = len(presentations_to_delete)
    
    for presentation in presentations_to_delete:
        try:
            # Delete physical file
            if presentation.file_path and os.path.exists(presentation.file_path):
                file_size = os.path.getsize(presentation.file_path)
                
                if not dry_run:
                    os.remove(presentation.file_path)
                    logger.info(f"Deleted file: {presentation.file_path}")
                else:
                    logger.info(f"[DRY RUN] Would delete: {presentation.file_path}")
                
                stats["deleted_files"] += 1
                stats["freed_bytes"] += file_size
            
            # Delete database record
            if not dry_run:
                await db.delete(presentation)
                stats["deleted_records"] += 1
            else:
                logger.info(f"[DRY RUN] Would delete record: ID={presentation.id}")
                stats["deleted_records"] += 1
                
        except Exception as e:
            logger.error(f"Error deleting presentation {presentation.id}: {str(e)}")
            stats["errors"] += 1
    
    if not dry_run:
        await db.commit()
    
    logger.info(
        f"Cleanup {'simulation' if dry_run else 'completed'}: "
        f"{stats['deleted_files']} files "
        f"({stats['deleted_records']} records: {len(failed_presentations)} failed uploads, "
        f"{len(expired_guests)} expired guests), "
        f"{stats['freed_bytes'] / (1024*1024):.2f}MB freed. "
        f"User uploads are never auto-deleted."
    )
    
    return stats

async def run_cleanup_worker() -> None:
    """Background worker that periodically removes failed/expired uploads."""
    logger.info("File cleanup worker started")
    try:
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    await cleanup_old_files(db, failed_days=FAILED_UPLOAD_RETENTION_DAYS)
            except Exception as exc:
                logger.error(f"File cleanup worker cycle failed: {exc}", exc_info=True)
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("File cleanup worker stopped")
        raise
