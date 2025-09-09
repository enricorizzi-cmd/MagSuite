# Anagraphics Data Model

This document outlines the main master data entities used in MagSuite.

## Partners

`partners` represents both customers and suppliers. Each row belongs to a company and is protected by row level security.

| Column      | Type    | Notes |
|-------------|---------|-------|
| id          | serial  | Primary key |
| company_id  | integer | References `companies(id)` |
| type        | text    | `customer` or `supplier` |
| name        | text    | Partner name, unique per company |
| vat_id      | text    | Optional VAT identifier |
| email       | text    | Optional contact email |

## Addresses

Partners can have one or more addresses.

| Column      | Type    | Notes |
|-------------|---------|-------|
| id          | serial  | Primary key |
| partner_id  | integer | References `partners(id)` |
| type        | text    | Address type (e.g. `primary`, `billing`) |
| street      | text    |  |
| city        | text    |  |
| postal_code | text    |  |
| country     | text    |  |
| company_id  | integer | References `companies(id)` |

Each `(partner_id, type)` pair is unique to avoid duplicate address types for the same partner.
