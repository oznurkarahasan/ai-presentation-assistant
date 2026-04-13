from email.message import EmailMessage
from typing import Optional
import aiosmtplib
from app.core.config import settings
from app.core.logger import logger


async def send_password_reset_email(to_email: str, token: str) -> bool:
    """Send a simple password reset email containing a link with the token.

    Returns True on success, False on failure.
    """
    if not settings.SMTP_HOST or not settings.SMTP_PORT:
        logger.error("SMTP not configured; cannot send email")
        return False

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"

    message = EmailMessage()
    from_header = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "no-reply@localhost"
    if settings.SMTP_FROM_NAME:
        message["From"] = f"{settings.SMTP_FROM_NAME} <{from_header}>"
    else:
        message["From"] = from_header

    message["To"] = to_email
    message["Subject"] = "Password Reset Request"

    body = f"You requested a password reset. Click the link below to reset your password:\n\n{reset_url}\n\nIf you didn't request this, you can safely ignore this email."
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=int(settings.SMTP_PORT),
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        logger.info(f"Sent password reset email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False


async def send_presentation_reminder_email(
    to_email: str,
    presentation_title: str,
    scheduled_at_text: str,
    note: Optional[str] = None,
) -> bool:
    """Send a presentation reminder email to the user."""
    if not settings.SMTP_HOST or not settings.SMTP_PORT:
        logger.error("SMTP not configured; cannot send presentation reminder email")
        return False

    message = EmailMessage()
    from_header = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "no-reply@localhost"
    if settings.SMTP_FROM_NAME:
        message["From"] = f"{settings.SMTP_FROM_NAME} <{from_header}>"
    else:
        message["From"] = from_header

    message["To"] = to_email
    message["Subject"] = "Presentation Reminder"

    body_lines = [
        "This is your scheduled presentation reminder.",
        "",
        f"Presentation: {presentation_title}",
        f"Presentation Time: {scheduled_at_text}",
    ]
    if note:
        body_lines.extend(["", f"Note: {note}"])

    message.set_content("\n".join(body_lines))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=int(settings.SMTP_PORT),
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        logger.info(f"Sent presentation reminder email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send presentation reminder email to {to_email}: {e}")
        return False
