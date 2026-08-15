# Icommerce — Paused Research & Decision Record

**Status:** PAUSED — research preserved, no product build approved.

**Decision:** Keep Icommerce as a future opportunity, but do not allocate current development time to it until a clearer, defensible gap is identified.

## 1. Original thesis

Icommerce began as an idea for agentic commerce: a user tells an AI agent what they want, the agent discovers suitable products/services, the user authorizes the transaction, payment is executed through appropriate rails, and the merchant fulfils the order.

The intended experience was:

> Tell an AI what you want → discover real offers → compare → authorize → pay → merchant fulfils.

The product was not intended to be an AI model, bank, wallet, logistics operator, or replacement for every merchant's existing commerce system.

## 2. Major concepts explored

### Agent identity and delegated authority

- Users should be able to use different AI clients (for example Claude, Gemini, ChatGPT) without unnecessarily exposing their identity to each AI provider.
- A user could manually create an Icommerce account and connect AI clients when needed.
- Authentication and authorization must distinguish conversation from actual purchasing authority.
- Authority should be bounded by purpose, amount, merchant, quantity, time, and other explicit constraints.
- Ambiguous instructions must stop execution rather than being interpreted generously.
- Material changes such as meaningful price increases, substitutions, unexpected fees, changed shipping, or changed product condition should trigger re-evaluation or confirmation.
- AI agents should never become the source of truth for payment, delivery, refund, or order state.

### Product disclosure and trust

A machine-readable product/offer representation was identified as a potentially important component. An AI should not have to infer critical facts from unstructured descriptions or images.

Important fields include:

- product identity and variant
- price and currency
- availability
- new/used/refurbished condition
- authenticity claims and evidence where applicable
- compatibility
- warranty
- seller identity and verification level
- delivery options, cost, and timing
- return/cancellation policy
- relevant restrictions and disclosures

The Product Disclosure Schema was treated as load-bearing for safe agent reasoning, but no final production schema was approved.

### Small and informal sellers

The system should not assume that every seller is a large brand or authorized retailer. Individuals and small merchants may:

- buy from wholesalers
- buy small quantities from verified vendors
- source products through other marketplaces
- resell new products
- sell used products
- sell without a formal brand relationship

Therefore seller trust and product quality should not simply mean “recognized brand.” Progressive verification and explicit product disclosures were preferred over a binary verified/unverified model.

### Standard e-commerce procedures

The architecture deliberately preferred ordinary e-commerce concepts and established order/fulfilment/return procedures instead of inventing a parallel commerce lifecycle.

The intended innovation was concentrated on the AI-facing layer: discovery, structured offers, authorization, trust, orchestration, and interoperability.

## 3. Market and competitive research

The core experience is no longer an empty market.

Relevant examples investigated included:

- **Shopify** — merchant commerce infrastructure and increasingly AI-native/agentic commerce.
- **Bumpa** — Nigerian-focused merchant operating software including inventory, POS, payments, social selling, websites and related business operations.
- **Paystack Index** — AI-accessible Nigerian transactions, including real transaction flows through supported AI clients and services.
- **BuyChat** — Nigerian AI shopping/marketplace experience with external-agent/MCP access.
- **Queek** — Nigerian natural-language commerce and delivery model.
- **PayBox** — controlled AI payment authority, demonstrating that users can delegate bounded spending authority to AI agents without exposing underlying payment credentials/keys.
- **Google UCP and other agentic-commerce standards** — industry movement toward standardized agent-to-merchant discovery, checkout, identity, and order flows.
- **ACP/AP2 and related protocols** — additional evidence that the underlying agentic-commerce plumbing is becoming standardized.

## 4. Strategic conclusions

Several possible Icommerce positions were considered.

### Rejected / weak as current thesis

**Nigerian Shopify:**

Too close to Shopify and, more importantly, Bumpa already demonstrates that Nigerian merchants have a localized commerce operating-system option.

**Another AI wallet/payment product:**

Too close to PayBox and existing payment infrastructure. Icommerce should not build a wallet merely because AI agents need payment authority.

**Another AI marketplace:**

This creates the classic marketplace chicken-and-egg problem and overlaps with existing Nigerian AI-commerce/marketplace efforts.

**Generic “AI can buy things” platform:**

No longer sufficiently differentiated. Real AI-assisted transactions already exist.

### Potential future thesis

The most interesting unresolved direction was an **interoperability/shopping layer**:

> Icommerce could potentially connect AI agents to fragmented Nigerian commerce systems so that merchants can remain on Shopify, Bumpa, WooCommerce, WhatsApp, custom stores, or other systems while their offers become discoverable and transactible through a common AI-facing interface.

This would require using existing standards where appropriate rather than inventing another protocol merely for differentiation.

A possible conceptual flow:

```text
AI agent
   ↓
Icommerce shopping/discovery layer
   ↓
Standardized trustworthy offers
   ↓
Shopify / Bumpa / WhatsApp / custom merchant systems
   ↓
Existing payment + fulfilment rails
```

This remained a **hypothesis**, not an approved product definition.

## 5. Why the project is paused

The user is already stretched across multiple projects. The evidence gathered so far does not justify diverting substantial execution time into Icommerce.

The correct decision is therefore:

> **Shelf the idea, preserve the research, and revisit only if a specific gap emerges that incumbents and emerging agentic-commerce platforms are unlikely or unwilling to solve.**

This is not a declaration that agentic commerce is a bad market. It is a resource-allocation decision.

## 6. Restart criteria

Icommerce should only return to active development if at least one of these becomes demonstrably true:

1. A clear Nigerian or emerging-market commerce problem exists that major AI/commerce/payment platforms do not solve well.
2. Users experience a meaningful pain that cannot be solved simply by using ChatGPT/Gemini/Claude + existing commerce/payment integrations.
3. Merchants have a strong incentive to connect to a neutral layer rather than integrating separately with every AI/commerce platform.
4. Icommerce can provide a defensible advantage in product data, trust, verification, logistics, authorization, interoperability, or another specific layer.
5. A small pilot can demonstrate real transactions and repeat usage without requiring Icommerce to replace merchants' existing operating systems.
6. The business model is attractive enough to justify the operational and integration complexity.

## 7. If restarted: first validation, not full build

Do **not** begin by building the full platform.

First test whether a thin interoperability layer can expose offers from a handful of heterogeneous Nigerian merchants to an external AI agent.

Potential pilot systems:

- Shopify
- Bumpa
- WhatsApp/social-first merchant
- custom website
- payment-provider storefront
- offline-first merchant

The experiment should answer:

> Can one standardized Icommerce interface let an external AI discover, understand, compare and eventually purchase from merchants using fundamentally different commerce systems?

Only a positive answer should lead to production architecture.

## 8. Current product-definition status

**No final product has been approved.**

**No production schema has been approved.**

**No merchant onboarding has been approved.**

**No implementation should begin solely from this document.**

The existing repository security planning remains useful background work, but it must not be interpreted as approval to build Icommerce.

## 9. Working principle for the future

If Icommerce is revived, the first question should be:

> **What can Icommerce own that Shopify, Google, OpenAI, Paystack, payment networks, marketplaces, and emerging agentic-commerce platforms cannot easily provide?**

If there is no strong answer, leave the project paused.
