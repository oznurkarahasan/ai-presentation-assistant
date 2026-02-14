#!/usr/bin/env python3
"""Simple script to test SMTP connectivity and authentication.

Usage:
  python scripts/test_smtp.py --to recipient@example.com

It reads SMTP settings from environment variables (or .env when available).
"""
import os
import argparse
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv


def main():
    load_dotenv()

    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT") or 0)
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    from_email = os.environ.get("SMTP_FROM_EMAIL") or smtp_user

    parser = argparse.ArgumentParser()
    parser.add_argument("--to", required=True, help="Recipient email address to send test message to")
    args = parser.parse_args()

    print("SMTP settings:")
    print(f"  host={smtp_host}")
    print(f"  port={smtp_port}")
    print(f"  user={smtp_user}")

    if not smtp_host or not smtp_port:
        print("ERROR: SMTP_HOST or SMTP_PORT not configured in environment (.env).")
        return

    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = args.to
    msg["Subject"] = "Test SMTP message"
    msg.set_content("This is a test message sent by scripts/test_smtp.py to validate SMTP settings.")

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.set_debuglevel(1)
            server.ehlo()
            # Try STARTTLS if server supports it
            try:
                server.starttls()
                server.ehlo()
            except Exception as e:
                print(f"STARTTLS not used / failed: {e}")
            if smtp_user and smtp_password:
                try:
                    server.login(smtp_user, smtp_password)
                except Exception as e:
                    print("Authentication failed:", e)
                    return
            server.send_message(msg)
            print("Test email sent successfully.")
    except Exception as e:
        print("Failed to send test email:", e)


if __name__ == "__main__":
    main()
