# ADR-002: Direct Vendor Store Redirects Only

**Status**: Accepted  
**Date**: July 2026  
**Deciders**: Product Owner, Lead Architect, CTO  

## Context
DaamDekho v1.0 aims to deliver a high-speed, reliable product comparison engine across Amazon, Flipkart, Croma, and JioMart.

## Decision
All "Buy Now" and "Visit Store" buttons redirect users directly to the original seller listing page URL with zero affiliate tracking parameters, tracking proxy wrappers, or revenue commission tracking logic.

## Consequences
- **Pros**: Clean architecture, high-speed instant redirects, zero tracking parameter overhead, zero legal partner coupling.
- **Cons**: Affiliate revenue tracking is disabled.
- **Future Target**: Affiliate tracking & proxy redirect engines are intentionally scheduled for Version 2.x+.
