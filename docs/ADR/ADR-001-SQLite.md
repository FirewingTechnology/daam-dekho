# ADR-001: SQLite Database Engine Selection for Version 1.0

**Status**: Accepted  
**Date**: July 2026  
**Deciders**: Lead Architect, DB Architect, CTO  

## Context
DaamDekho v1.0 requires a lightweight, fast relational store to persist master products, variant specifications, vendor listings, and price history snapshots.

## Decision
We selected **SQLite** (configured with WAL mode, foreign keys, and 5000ms busy timeout) as our primary database engine for Version 1.0.

## Consequences
- **Pros**: Zero-configuration serverless deployment, sub-2ms query read latency, atomic transactions, zero network latency overhead.
- **Cons**: Write concurrency limited to single writer (handled cleanly by WAL mode).
- **Future Target**: Migrate to PostgreSQL cluster when write concurrency or database size demands horizontal scaling.
