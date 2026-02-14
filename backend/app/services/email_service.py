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
