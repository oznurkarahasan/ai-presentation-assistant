"""
File cleanup service for managing old uploaded files.
"""
from pathlib import Path
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.presentation import Presentation, PresentationStatus
from app.core.logger import logger
import os

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

async def cleanup_orphaned_files(upload_dir: str = "uploaded_files") -> dict:
    """
    Removes files from disk that don't have corresponding database records.
    
    Args:
        upload_dir: Directory containing uploaded files
        
    Returns:
        dict: Statistics about cleanup
    """
    stats = {
        "checked": 0,
        "orphaned": 0,
        "deleted": 0,
        "freed_bytes": 0
    }
    
    upload_path = Path(upload_dir)
    if not upload_path.exists():
        logger.warning(f"Upload directory does not exist: {upload_dir}")
        return stats
    
    # Get all files in upload directory
    all_files = list(upload_path.glob("**/*.*"))
    stats["checked"] = len(all_files)
    
    # This function should be called with database session
    # For now, just log orphaned files
    logger.info(f"Found {len(all_files)} files in {upload_dir}")
    
    return stats
