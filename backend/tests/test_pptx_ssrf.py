"""
Tests for the SSRF guard-rails in app.services.pptx_service around
PPTX image embedding (_is_public_ip / _fetch_image_bytes_safely).

PPTX export fetches image URLs server-side. Without these checks a user
could point an image URL at an internal service or a cloud metadata
endpoint (e.g. 169.254.169.254) and exfiltrate the response via the
generated file.
"""
import socket

import pytest

from app.services import pptx_service


# --- _is_public_ip ---------------------------------------------------------

@pytest.mark.parametrize("ip,expected", [
    ("8.8.8.8", True),          # public
    ("1.1.1.1", True),          # public
    ("10.0.0.1", False),        # private (RFC1918)
    ("172.16.0.5", False),      # private (RFC1918)
    ("192.168.1.1", False),     # private (RFC1918)
    ("127.0.0.1", False),       # loopback
    ("169.254.169.254", False),  # link-local — cloud metadata endpoint
    ("224.0.0.1", False),       # multicast
    ("0.0.0.0", False),         # unspecified
    ("::1", False),             # IPv6 loopback
    ("fe80::1", False),         # IPv6 link-local
])
def test_is_public_ip(ip, expected):
    assert pptx_service._is_public_ip(ip) is expected


# --- _fetch_image_bytes_safely ---------------------------------------------

def test_fetch_image_rejects_non_https_scheme():
    with pytest.raises(ValueError, match="scheme"):
        pptx_service._fetch_image_bytes_safely("http://images.unsplash.com/photo.jpg")


def test_fetch_image_rejects_disallowed_host():
    """Even a plausible-looking host outside the allow-list must be rejected —
    this is the primary defense against SSRF via attacker-controlled URLs."""
    with pytest.raises(ValueError, match="not allowed"):
        pptx_service._fetch_image_bytes_safely("https://evil.example.com/photo.jpg")


def test_fetch_image_rejects_internal_host_disguised_as_unsplash():
    with pytest.raises(ValueError, match="not allowed"):
        pptx_service._fetch_image_bytes_safely("https://images.unsplash.com.evil.com/photo.jpg")


def test_fetch_image_rejects_dns_resolution_failure(monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        raise socket.gaierror("name resolution failed")

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError, match="Could not resolve"):
        pptx_service._fetch_image_bytes_safely("https://images.unsplash.com/photo.jpg")


def test_fetch_image_rejects_host_resolving_to_private_ip(monkeypatch):
    """Guards against DNS rebinding: an allow-listed hostname that resolves
    to an internal address must still be rejected."""
    def fake_getaddrinfo(host, port, proto=None):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 443))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError, match="non-public address"):
        pptx_service._fetch_image_bytes_safely("https://images.unsplash.com/photo.jpg")


def test_fetch_image_rejects_metadata_endpoint_resolution(monkeypatch):
    def fake_getaddrinfo(host, port, proto=None):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 443))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError, match="non-public address"):
        pptx_service._fetch_image_bytes_safely("https://images.unsplash.com/photo.jpg")
