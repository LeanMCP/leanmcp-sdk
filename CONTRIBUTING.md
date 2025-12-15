# Contributing to LeanMCP

Thank you for your interest in contributing to LeanMCP.

LeanMCP is an early-stage, opinionated infrastructure project focused on building a
**production-ready runtime for Model Context Protocol (MCP) servers**.

We welcome contributors who care deeply about correctness, clarity, and long-term
maintainability of developer infrastructure.

This document explains how we collaborate and how to contribute effectively.

---

## Project Philosophy

LeanMCP is infrastructure software.

That means we prioritize:

- correctness over speed
- clarity over flexibility
- coherent abstractions over feature accumulation

Not every idea needs to be implemented, and not every implementation should be merged.
Design alignment matters.

---

## What We Welcome

We especially appreciate contributions in the following areas:

- **Bug fixes and correctness improvements**
- **Documentation clarity** (examples, explanations, edge cases)
- **Incremental improvements** aligned with existing abstractions
- **Design discussions** around runtime behavior, APIs, and semantics

Because LeanMCP operates at the runtime and protocol layer, we are cautious about changes
that increase surface area or complexity without clear justification.

---

## What We Discourage

To keep the system coherent, we generally discourage:

- large refactors without prior discussion
- API changes driven by personal preference rather than clear use cases
- feature additions that bypass or duplicate existing abstractions
- cosmetic or stylistic changes without functional impact

This does not mean ideas are unwelcome—only that **design should come before code**.

---

## How to Get Started

If you are new to LeanMCP:

1. Browse existing issues, especially those labeled `good-first-issue` or `design-discussion`.
2. For changes that affect public APIs, runtime behavior, or semantics, open an issue
   or discussion **before** submitting a pull request.
3. Join our Discord to ask questions or discuss design ideas with maintainers.

We encourage early discussion to avoid unnecessary rework.

---

## Design-First Contributions

LeanMCP follows a **design-first contribution model**.

Changes that affect:

- public APIs
- runtime execution model
- context propagation
- authentication or authorization behavior

should be discussed and agreed upon before code is written.

This helps ensure the runtime remains predictable and internally consistent.

---

## Pull Requests

When submitting a pull request:

- Keep changes focused and scoped.
- Prefer small, reviewable PRs over large ones.
- Explain **why** a change is needed, not just **what** it does.
- Expect reviewers to focus on design alignment, correctness, and long-term impact.

Not all pull requests will be merged, and that is okay.
Feedback is part of the collaboration process.

---

## Communication and Conduct

We aim to maintain a respectful, thoughtful, and inclusive community.

Please assume good intent, be constructive in discussions, and follow the project's
Code of Conduct.

---

## Questions

If you are unsure where to start or whether an idea fits LeanMCP, the best next step
is to open a discussion or ask in Discord.

We would rather discuss early than review late.
