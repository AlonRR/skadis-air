# Security policy

## Reporting a vulnerability

Please report security issues **privately**, not in a public issue.

- Preferred: open a private report through the repository host's security advisory feature.
- Otherwise: contact the maintainer through the address on the GitHub profile
  [`@AlonRR`](https://github.com/AlonRR).

Please include what you found, how to reproduce it, and what an attacker could do with it.

## Scope and support

Only the **latest commit on the default branch** is supported. These are personal projects
maintained by one person: expect an acknowledgement within a week, and no guaranteed fix
timeline. If a fix is not practical, the issue will be documented in the README instead.

## What is out of scope

- Findings that require the attacker to already control the machine the tool runs on.
- Hard-coded values in `*.example.*` files: those are placeholders, by design.
- Reports produced solely by a scanner, with no analysis of whether the finding is reachable.
