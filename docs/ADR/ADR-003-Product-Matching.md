# ADR-003: Cross-Vendor Product Matching via Master Product Model

**Status**: Accepted  
**Date**: July 2026  
**Deciders**: Data Engineer, Product Matching Specialist, CTO  

## Context
Various retailers list the same physical product under different titles (e.g. "Apple iPhone 15 (128 GB) - Black" vs "APPLE iPhone 15 Black 128GB").

## Decision
Implement a 3-tier relational entity model: `products_master` $\rightarrow$ `product_variants` $\rightarrow$ `vendor_products`. Product matching combines RapidFuzz token matching, sub-model word boundary checking, and exact spec matching (RAM, Storage, Color).

## Consequences
- **Pros**: Eliminates duplicate product listings, guarantees true price comparison, prevents false-positive merges (e.g., iPhone 15 vs iPhone 15 Pro).
- **Cons**: Requires strict extraction rules in data cleaner pipeline.
