# Icommerce — Complete Research Archive

**Project status:** PAUSED / SHELVED

**Purpose:** Preserve the product thinking, business architecture, technical direction, security work, decisions, rejected directions, and unresolved questions developed before Icommerce was paused.

> This is a research archive, not a production specification. Nothing in this document authorizes implementation.

---

## 1. Executive summary

Icommerce (originally referred to as He-commerce) was explored as a global, agentic-commerce infrastructure company.

The central user experience was:

> **Tell an AI what you want → the AI discovers real offers → compares them → obtains/uses bounded authorization → purchases → merchant fulfils.**

The ambition was not to build another AI model, bank, wallet, logistics company, or ordinary online store. The goal was to make commerce understandable and actionable by AI agents while allowing users to move between AI clients such as Claude, Gemini, ChatGPT, and future agents.

During exploration, the concept expanded into:

- agent/user identity
- delegated authorization
- AI-readable product and offer data
- merchant verification
- trust and disclosure
- standard e-commerce order lifecycle
- payments and payment-provider abstraction
- cross-border commerce
- merchant infrastructure
- AI-agent interoperability
- security and threat modelling
- global positioning

The project was deliberately paused after competitive research showed that the basic AI-shopping transaction is becoming crowded and standardized. Existing and emerging players include Paystack Index, BuyChat, PayBox, Shopify, Google/UCP, and other agentic-commerce initiatives.

The strongest unresolved opportunity identified was a possible **neutral interoperability/shopping layer** for fragmented Nigerian commerce: allowing AI agents to discover and transact with merchants using different existing systems such as Shopify, Bumpa, WhatsApp, custom stores, and other commerce infrastructure without forcing merchants to replace their systems.

That idea remains unproven and is not currently approved for development.

---

# 2. Original product vision

Icommerce was intended to make shopping through AI agents a first-class experience.

A user could say something like:

> “Find me a 55-inch TV under ₦500,000, from a trusted Nigerian seller, delivered to Ota.”

The AI should be able to:

1. Understand the user's intent.
2. Search real merchant offers.
3. Compare products and sellers.
4. Understand price, availability, condition, delivery, warranty and returns.
5. Respect the user's purchasing rules.
6. Ask for confirmation when required.
7. Complete the purchase through appropriate payment/checkout infrastructure.
8. Track the order.
9. Handle ordinary post-purchase flows such as cancellation, return and refund.

The important design principle was that the AI is an **interface and decision assistant**, not the ultimate source of truth for payment, fulfilment or financial state.

---

# 3. What Icommerce was NOT intended to be

We repeatedly narrowed the scope to avoid building five companies at once.

Icommerce was not intended to become:

- an AI model company
- a general-purpose chatbot
- a bank
- a crypto wallet
- a payment processor from scratch
- a logistics company
- a universal merchant-of-record
- a Nigerian clone of Shopify
- another ordinary marketplace
- a replacement for existing merchant ERP/POS systems
- a replacement for Paystack/Flutterwave or other payment rails
- a company that competes directly with Microsoft/Google/OpenAI at the model layer

The preferred approach was **shared infrastructure and interoperability**, where existing systems could continue operating underneath Icommerce.

---

# 4. User identity and agent identity

A major question was:

> How can a user use Claude today, Gemini tomorrow, and potentially another AI next month while retaining a consistent Icommerce identity without unnecessarily exposing their identity to each AI provider?

The proposed direction was to make Icommerce identity independent from any one AI provider.

A user could:

- manually create an Icommerce account
- manage their identity and account details there
- connect one or more AI clients/agents
- grant each connected agent bounded permissions
- revoke connections
- manage authentication credentials separately

The desired experience was that a user should not have to repeatedly create a new commerce identity just because they changed AI providers.

The project also explored the idea that AI clients could interact with Icommerce through tool/API protocols in a manner similar to how AI agents interact with GitHub.

The key distinction was:

> **Agent connection is not the same thing as transaction authorization.**

---

# 5. Authorization model

This became one of the strongest architectural principles.

### Core rule

> **Conversation is not authorization.**

An AI must not interpret casual natural-language statements as unlimited purchasing authority.

Examples discussed included dangerous ambiguity such as:

> “I will pay $1 million for a sandwich right now.”

or:

> “Do your thing.”

The system must not infer that the user has authorized any amount, any product, or any transaction merely because the language could be interpreted that way.

### Authorization should be bounded by factors such as:

- purpose
- maximum amount
- currency
- merchant
- product/category
- quantity
- geographic scope
- time window
- payment method
- frequency
- substitution rules
- delivery constraints
- confirmation requirements

### Ambiguity principle

If the AI cannot reliably determine the user's intent within the granted authority:

> **Stop and ask.**

Never “helpfully” expand the user's authority.

### Material changes

A previously authorized transaction should be re-evaluated if a material change occurs, including:

- meaningful price increase
- unexpected tax/duty
- new delivery charge
- changed shipping time
- product substitution
- changed product condition
- material warranty difference
- changed seller
- changed quantity
- changed currency

Exact thresholds were intentionally left for later policy definition.

---

# 6. Product Disclosure Schema

The Product Disclosure Schema was identified as one of the most important potential pieces of Icommerce.

AI agents should not have to infer critical purchasing facts from marketing prose, arbitrary webpages, or images.

A machine-readable offer should expose information such as:

### Product

- product identifier
- title
- description
- category
- brand
- model
- variant
- quantity
- compatibility

### Condition

- new
- used
- refurbished
- open-box
- damaged
- unknown

### Authenticity

- seller claim
- evidence where available
- verification status
- authorized-reseller status where applicable

### Commercial terms

- price
- currency
- discounts
- taxes where known
- fees
- availability
- inventory freshness

### Seller

- seller identity
- verification level
- business registration information where appropriate
- location
- reputation/trust information

### Fulfilment

- delivery options
- delivery cost
- estimated delivery time
- service area
- pickup availability

### After-sales

- warranty
- return policy
- cancellation policy
- refund policy

### Transaction

- supported checkout method
- supported payment methods
- supported agent/commerce protocol
- offer expiration

The schema was **not finalized**. It remained a design direction to be refined if the project returned.

---

# 7. Merchant model and progressive verification

The project explicitly considered merchants that are not large formal brands.

A merchant could be:

- a formal registered company
- a small business
- an individual reseller
- a retailer buying from wholesalers
- a seller sourcing from other marketplaces
- a used-goods seller
- a social-commerce seller
- a physical shop operating primarily through WhatsApp

Therefore:

> **Trust should not simply equal brand recognition.**

The proposed approach was progressive verification rather than an all-or-nothing gate.

Potential verification evidence could include appropriate business or identity information, transaction history, category-specific requirements and platform behaviour.

High-risk categories such as pharmaceuticals were explicitly considered for later phases rather than being part of the initial rollout.

---

# 8. Pharmacy / regulated categories

We discussed onboarding pharmacies and recognized that pharmaceuticals require substantially stronger controls.

The decision at the time was:

> **Pharmacists should not be part of the initial phase. They could be considered in a later phase after the general trust, verification, transaction and safety infrastructure is mature.**

This reflected the principle that category-specific regulatory requirements should be layered onto a general commerce architecture rather than pretending every merchant category has the same risk profile.

---

# 9. Order lifecycle

The project deliberately decided not to invent a completely new order lifecycle.

The principle was:

> **Use standard e-commerce procedures wherever they already work.**

Conceptual flow:

```text
Discovery
  ↓
Offer selection
  ↓
Cart / checkout
  ↓
Authorization
  ↓
Payment
  ↓
Order creation
  ↓
Merchant acceptance
  ↓
Fulfilment
  ↓
Shipment / delivery
  ↓
Delivered
  ↓
Return / refund / cancellation when applicable
```

The innovation was intended to occur primarily at the AI-facing interface and orchestration layer, not by inventing a new definition of an order.

---

# 10. Payment architecture

A major strategic conclusion was that Icommerce should **not automatically become a wallet**.

The project examined the possibility of using existing payment providers and payment technologies including:

- Paystack
- Flutterwave
- cards
- bank rails
- crypto/stablecoin rails where appropriate
- third-party agent-payment infrastructure such as PayBox

The core principle was:

> **The AI should not receive raw payment credentials or underlying private keys merely to make a purchase.**

Payment authorization should be scoped, auditable and revocable.

The PayBox model was particularly relevant because it demonstrated the concept of controlled agent payment authority without handing the AI the underlying financial secret.

That led to a distinction:

**PayBox-like infrastructure = money/authorization layer.**

**Icommerce hypothesis = commerce/shopping layer.**

However, the project later recognized that even the commerce layer is becoming crowded.

---

# 11. Cross-border commerce

Cross-border transactions were identified as substantially more complex than domestic shopping.

Potential issues include:

- currency conversion
- payment acceptance
- taxes
- customs duties
- import restrictions
- shipping
- delivery address validation
- returns across borders
- refunds
- merchant-of-record responsibilities
- sanctions/restricted goods
- consumer protection differences
- identity/verification requirements

The early strategic principle was not to solve every cross-border rail ourselves.

Instead, Icommerce would ideally orchestrate existing providers and standards while clearly assigning responsibility to the relevant merchant, payment provider, logistics provider and other parties.

No final cross-border product was approved.

---

# 12. Merchant infrastructure concept

An early direction explored whether Icommerce could offer shared infrastructure for merchants, somewhat analogous to Shopify but focused on AI-native commerce.

The idea included:

- hosted storefronts
- merchant onboarding
- catalogue infrastructure
- AI-readable product data
- payment integrations
- security standards
- merchant verification
- AI shopping-agent access
- possible custom domains/templates

However, repeated comparison with Shopify and Bumpa showed that simply offering “another merchant operating system” was not sufficiently differentiated.

This direction was therefore downgraded.

---

# 13. Shopify question

A recurring strategic test was:

> Why would a merchant leave Shopify for Icommerce?

The conclusion was that merchants **should not have to leave Shopify** merely to participate in AI commerce.

This led to the stronger interoperability hypothesis:

> Shopify can remain the merchant's system of record while Icommerce, if it ever exists, exposes an AI-facing representation of the merchant's offers.

The same logic could apply to Bumpa, WooCommerce, WhatsApp-based commerce, custom websites and other systems.

This was one of the most important shifts in the thinking.

---

# 14. AI-readable merchant ecosystem

The proposed architecture evolved toward:

```text
                    USER
                     │
                     ▼
                  AI AGENT
           Claude / Gemini / ChatGPT
                     │
                     ▼
              ICOMMERCE LAYER
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     Shopify        Bumpa      WhatsApp
     merchant      merchant     merchant
        │            │            │
        └────────────┼────────────┘
                     ▼
              Existing payment
                + fulfilment
```

The merchant would not necessarily move their whole business onto Icommerce.

Instead, Icommerce would potentially normalize fragmented commerce systems into a common AI-facing representation.

The central object became the **Offer**, rather than the Store.

---

# 15. Offer as a core abstraction

The emerging conceptual model was:

```text
Merchant
   ↓
Product
   ↓
Offer
   ↓
Cart
   ↓
Checkout
   ↓
Payment
   ↓
Order
   ↓
Fulfilment
   ↓
Return / refund
```

The Offer would combine product information with commercial conditions such as price, availability, seller, condition, delivery and policies.

This makes it possible for an AI to compare offers from different merchants without pretending that the underlying merchant systems are identical.

---

# 16. AI provider independence

The project did not want the user to be locked to one AI provider.

The desired future model was:

> Claude today. Gemini tomorrow. ChatGPT later. Same user, same commerce authority, different interface.

AI providers would ideally act as clients/interfaces rather than owning the user's underlying commerce identity.

This also reduced the assumption that any AI company would disclose its users' private identity data to Icommerce.

Instead, an explicit connection/authorization mechanism would be required.

---

# 17. Protocol thinking

We explored whether Icommerce could use the same general model by which AI agents interact with systems such as GitHub: standardized tools, APIs, machine-readable capabilities and scoped permissions.

The conclusion was:

- AI agents need machine-readable tools.
- Authentication and authorization must be explicit.
- Icommerce should not assume the AI provider will reveal the user's private conversation or identity.
- Existing standards should be reused wherever possible.
- Icommerce should not invent a new protocol solely for branding.

The emergence of MCP, ACP, AP2, UCP and related standards strengthened the last conclusion.

---

# 18. Agentic-commerce standards

The market moved rapidly while this project was being explored.

We tracked the emergence of:

- MCP
- ACP
- AP2
- UCP
- AI-native commerce APIs
- agent payment authorization patterns

This changed the strategic calculation.

If large companies and industry groups are standardizing agent-to-merchant discovery, checkout, identity and order flows, then Icommerce cannot justify itself simply by inventing equivalent plumbing.

The future opportunity, if any, must be above, beside or complementary to those standards.

---

# 19. Competitive landscape explored

The major comparison set included:

### Shopify

Global merchant commerce infrastructure with increasingly strong AI/agentic-commerce capabilities.

### Bumpa

Nigeria-focused merchant operating infrastructure including commerce operations, inventory, POS and social selling.

### Paystack

Strong Nigerian/African payment infrastructure, with AI-accessible transaction capabilities emerging through Index.

### Flutterwave

Major African payment infrastructure with merchant/storefront capabilities.

### Jumia / Konga

Marketplace models with established Nigerian merchant/customer networks.

### BuyChat

A Nigerian AI-shopping/marketplace direction with external AI-agent access through MCP.

### Queek

Natural-language commerce/delivery direction in Nigeria.

### PayBox

AI-controlled payment authority and transaction execution.

### Google / UCP

Large-scale agentic-commerce standardization and merchant connectivity.

### Other global agentic commerce initiatives

Increasing convergence around AI discovery, checkout, payment authorization and post-purchase orchestration.

---

# 20. The decisive competitive realization

The question was originally:

> “Can Icommerce let an AI buy something?”

The answer became **yes, others can already do this.**

The stronger question became:

> **Can Icommerce solve a specific problem that existing AI, commerce, payment and marketplace systems cannot solve well?**

Possible gaps identified included:

- trustworthy Nigerian product data
- product-condition disclosure
- counterfeit/quality signals
- cross-platform merchant discovery
- agent authorization/auditability
- Nigerian logistics and returns for AI agents
- machine-readability for small/social merchants
- neutral interoperability across commerce platforms

However, these were identified as **potential gaps**, not proven company opportunities.

---

# 21. Business-model possibilities explored

Potential revenue models included:

- merchant transaction fee
- merchant subscription
- consumer subscription
- API/usage fee
- referral/commission
- payment-related revenue
- premium merchant tools
- trust/verification services
- combination of transaction and infrastructure revenue

The project never reached a final pricing decision because the product wedge itself remained unresolved.

---

# 22. Merchant economics question

A central concern was:

> Why would a merchant voluntarily connect to Icommerce instead of connecting directly to Shopify, Google, OpenAI, Paystack, or another AI-commerce ecosystem?

The answer cannot simply be:

> “Because Icommerce has AI.”

A merchant needs a measurable benefit such as:

- more sales
- cheaper distribution
- one integration instead of many
- access to multiple AI agents
- better product discoverability
- trusted identity/reputation
- easier cross-border sales
- reduced integration complexity
- better order orchestration

If Icommerce cannot provide one or more of these at a compelling level, merchants have little reason to participate.

---

# 23. User economics question

We also considered whether consumers would pay for the service.

The conclusion was that consumer subscription should not be assumed.

If Icommerce generated value by making shopping easier, its initial monetization could potentially come from the transaction/merchant side rather than charging users directly.

This was never finalized.

---

# 24. Security architecture

Security was treated as a first-class concern because Icommerce would potentially sit between users, AI agents, merchants and payment systems.

The repository already contains separate security planning documents:

- `SECURITY_RULES.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/DATABASE_SECURITY.md`
- `scripts/check_rls.sql`
- `supabase/migrations/0001_tenant_foundation.sql`

These documents should be treated as part of the preserved technical research, not as authorization to build the product.

Key security concerns identified included:

- prompt injection from merchant content
- malicious product descriptions
- malicious seller instructions
- agent privilege escalation
- authorization-grant phishing
- identity spoofing
- payment abuse
- order manipulation
- inventory spoofing
- price manipulation
- fraudulent merchants
- progressive-verification gaming
- data leakage
- cross-tenant data access
- unsafe database permissions
- refund abuse
- agent collusion

The guiding principle was:

> **Untrusted merchant content must never become trusted instructions to the purchasing agent.**

---

# 25. Multi-merchant coordination

The project considered requests where one natural-language instruction could result in multiple merchant orders.

Example:

> “Set up everything I need for a small birthday party under ₦150,000.”

An AI could potentially select products/services from multiple merchants.

This creates additional requirements:

- clear order attribution
- separate merchant responsibility
- partial failure handling
- cancellation rules
- refund attribution
- delivery coordination
- unified user status without hiding merchant boundaries

This was recognized as powerful but operationally complex and not suitable as an initial scope.

---

# 26. Cross-platform merchant experiment — proposed, not executed

One proposed validation experiment was to test approximately ten Nigerian merchants using different commerce systems.

Representative categories:

1. Shopify
2. Shopify
3. Bumpa
4. Bumpa
5. WhatsApp Business
6. Instagram/WhatsApp social commerce
7. Custom website
8. Physical/offline-first store
9. Payment-provider storefront
10. Merchant with no formal website

The experiment would test whether a thin Icommerce interface could expose standardized offers from heterogeneous merchants to an external AI agent.

### Proposed validation levels

**Level 1 — Discovery**

Can the AI find real merchant products?

**Level 2 — Understanding**

Can it correctly understand price, condition, quantity, seller, delivery and policies?

**Level 3 — Purchase**

Can a user-approved instruction result in the correct cart/checkout transaction?

**Level 4 — Fulfilment**

Can the merchant receive and fulfil the order using their existing operations?

This experiment was never started because the strategic decision to pause came first.

---

# 27. What would make the interoperability thesis valuable?

The strongest potential positioning became:

> **Icommerce could make the existing commerce economy accessible to AI agents without forcing every merchant to rebuild for every AI platform.**

This would be valuable only if Icommerce could provide a neutral, trusted layer that reduces fragmentation.

Potential value:

```text
One merchant integration
        ↓
Multiple AI agents
        ↓
Multiple user experiences
        ↓
Existing payment + fulfilment
```

But this remains a hypothesis because standards such as UCP are moving toward the same general interoperability goal.

---

# 28. Global vs Nigeria-first positioning

The ambition was initially global.

The reasoning was that agentic commerce is inherently cross-border and AI agents do not respect national storefront boundaries.

However, Nigeria offered a potential wedge because of:

- fragmented commerce infrastructure
- large WhatsApp/social-commerce usage
- many small merchants
- uneven product data quality
- trust problems
- logistics complexity
- local payment requirements
- growing digital commerce

The challenge is that a Nigeria-first strategy only makes sense if Icommerce solves a uniquely valuable Nigerian problem rather than simply being a smaller version of global agentic commerce platforms.

---

# 29. Why the project was paused

The user is working on multiple projects and explicitly recognized that attention is the scarce resource.

After researching the landscape, the conclusion was:

> **Do not build Icommerce simply because AI shopping is exciting.**

The core experience already has credible competitors and major platforms moving into the space.

The project therefore moved from:

**BUILD**

to:

**RESEARCH / SHELVE**

This is not a statement that agentic commerce has no future.

It is a capital-allocation decision:

> **Do not spend scarce execution time until a defensible gap is proven.**

---

# 30. Restart criteria

Icommerce should only return to active development if evidence shows at least one of the following:

1. A major Nigerian/emerging-market commerce problem remains underserved.
2. Users cannot solve the problem adequately with existing AI + commerce integrations.
3. Merchants have a strong reason to integrate once with Icommerce instead of separately with many platforms.
4. Icommerce has a defensible advantage in product data, trust, verification, authorization, logistics, interoperability or another layer.
5. A small pilot demonstrates real transactions and repeat usage.
6. Merchant acquisition economics work.
7. User retention/transaction frequency is strong enough.
8. The required integrations are economically and technically manageable.
9. Existing standards can be used rather than fought.
10. The business can become valuable without requiring Icommerce to replace every underlying merchant system.

---

# 31. Questions left intentionally unanswered

These questions were not resolved and should be revisited only if the project is restarted:

- What exactly should Icommerce own?
- Who is the primary paying customer?
- What is the minimum merchant integration?
- What should be standardized by Icommerce versus UCP/other standards?
- How should user identity be linked across AI providers?
- What exact authorization token/grant model should be used?
- What constitutes a material change?
- What should happen when an offer becomes unavailable after authorization?
- Who is responsible for refunds in every payment architecture?
- How should cross-border duties and returns be represented?
- How should merchant trust scores be generated without creating unfair black boxes?
- How should product authenticity be represented without making unsupported claims?
- How should informal merchants participate safely?
- What categories require special verification?
- What is the best revenue model?
- What is the defensible moat?

---

# 32. Current decision

**Icommerce is paused.**

No production build should begin from this archive.

The repository is a time capsule for the thinking completed so far.

The project can be revived if new evidence creates a clear opportunity.

The first question on revival should always be:

> **“What can Icommerce uniquely own that the major AI, commerce, payment and marketplace platforms cannot easily provide?”**

If the answer is weak, leave it paused.

If the answer is strong, run a small validation experiment before building the platform.

---

# 33. Relationship to repository technical work

The existing repository contains early technical/security work created during the exploration.

Relevant files include:

- `README.md`
- `SECURITY_RULES.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/DATABASE_SECURITY.md`
- `scripts/check_rls.sql`
- `supabase/migrations/0001_tenant_foundation.sql`
- `docs/ICOMMERCE_PAUSED_RESEARCH.md`

These files collectively preserve the fact that technical architecture and security thinking had already begun before the product definition was ultimately paused.

**Important:** technical artifacts do not mean the product has been approved for production development.

---

# 34. Final principle

The most important lesson from the project is not a particular schema or architecture.

It is the product discipline:

> **Do not build an infrastructure company merely because the technology is possible. Build only when there is a problem that customers urgently need solved and a reason incumbents will not simply absorb the solution.**

Icommerce remains a potentially valuable idea.

For now, it is preserved—not pursued.
