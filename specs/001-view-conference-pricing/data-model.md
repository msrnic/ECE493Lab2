# Data Model: View Conference Pricing (UC-16)

## Scope Sources

- `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-16.md`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-16-AS.md`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/spec.md`

## Entities

### ConferenceCurrency

| Field | Type | Required | Validation |
|------|------|----------|------------|
| `code` | string | Yes | Must match `^[A-Z]{3}$` (ISO 4217 code). |
| `symbol` | string | Yes | Non-empty display symbol configured by the backend. |

### PricingConfiguration

| Field | Type | Required | Validation |
|------|------|----------|------------|
| `configurationId` | string | Yes | Stable non-empty identifier. |
| `currency` | `ConferenceCurrency` | Yes | Must be present for all displayed pricing outcomes. |
| `items` | `PricingItem[]` | Yes | Keep only complete entries before view rendering. |
| `lastUpdatedAt` | string (ISO-8601 datetime) | Yes | Must parse as valid datetime string. |

### PricingItem

| Field | Type | Required | Validation |
|------|------|----------|------------|
| `itemId` | string | Yes | Unique within one configuration. |
| `label` | string | Yes | 1-80 chars; user-facing category label. |
| `amountMinor` | integer | Yes | `>= 0`; minor currency units. |
| `attendeeType` | enum | Yes | One of `standard`, `student`, `other`. |
| `discount` | `PrecomputedDiscount \| null` | No | Present only when precomputed values exist. |
| `displayOrder` | integer | Yes | `>= 0`; determines rendered ordering. |

### PrecomputedDiscount

| Field | Type | Required | Validation |
|------|------|----------|------------|
| `label` | string | Yes | 1-80 chars. |
| `amountMinor` | integer | Yes | `>= 0` and `<= PricingItem.amountMinor`. |

### PricingPageOutcome

| Field | Type | Required | Validation |
|------|------|----------|------------|
| `status` | enum | Yes | One of `pricing-displayed`, `pricing-missing`, `pricing-temporarily-unavailable`. |
| `configuration` | `PricingConfiguration \| null` | Conditional | Required only when `status=pricing-displayed`. |
| `message` | string \| null | Conditional | Required for missing/unavailable outcomes; must be distinct text per FR-007. |
| `retryAllowed` | boolean | Yes | `true` only when `status=pricing-temporarily-unavailable`. |

## Relationships

- `PricingConfiguration` has many `PricingItem` entries.
- `PricingItem` may have zero or one `PrecomputedDiscount`.
- `PricingPageOutcome` references one `PricingConfiguration` when pricing is displayed; otherwise it carries only message metadata.

## State Transitions

1. `loading` -> `pricing-displayed` when configuration retrieval succeeds with complete pricing items.
2. `loading` -> `pricing-missing` when configuration is absent.
3. `loading` -> `pricing-temporarily-unavailable` when retrieval fails transiently.
4. `pricing-temporarily-unavailable` -> `loading` when user selects Try Again.
5. Retry outcome transitions from `loading` to one of the three terminal outcomes above based on latest retrieval result.

## Derived View Rules

- Omit incomplete pricing items before rendering to satisfy edge-case handling.
- Render `discount` details only when the `PrecomputedDiscount` object is present.
- Format all price values from `amountMinor` using `ConferenceCurrency.code` with no currency conversion.
