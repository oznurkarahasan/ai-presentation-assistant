# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please report it privately so we can address it before public disclosure.

- **Preferred channel:** Email the maintainer at `precueai@gmail.com`.
- **What to include:**
	- A clear description of the issue
	- Steps to reproduce
	- Impact and potential exploitation details
	- Affected versions or commit/branch
	- Any proof-of-concept or logs (if available)

We aim to acknowledge reports within **72 hours** and provide status updates as the issue is investigated.

## Supported Versions

Security fixes are provided for the latest release and the `development` branch.

## Dependency and Version Safety

To reduce security and compatibility risk, avoid downgrading core framework versions.

- Do not downgrade Next.js or React without an explicit security review.
- Record any dependency upgrades/downgrades in the changelog.
- Prefer patch/minor upgrades; treat major version changes as breaking and test thoroughly.
- Do not downgrade these security-sensitive dependencies without review:
	- `fastapi`, `sqlalchemy`, `pydantic`, `asyncpg`
	- `openai` SDK (API behavior changes can affect reliability and output format)
	- `python-jose`, `passlib`, `bcrypt`

## Disclosure Policy

- Please allow a reasonable time for us to investigate and release a fix.
- We will credit reporters who request attribution.
