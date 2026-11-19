import type { IconName } from "../../../components/Icon";

export const IMG = {
  heroShopper: "/images/landing/hero-shopper.png",
  heroCity: "/images/landing/hero-city.jpg",
  boutique: "/images/landing/shopper-boutique.jpg",
  officer: "/images/landing/verification-officer.jpg",
  customer: "/images/landing/customer-phone.jpg",
  handover: "/images/landing/delivery-handover.jpg",
  market: "/images/landing/sourcing-market.jpg",
  thandi: "/images/landing/spotlight-thandi.jpg",
  nomsa: "/images/landing/spotlight-nomsa.jpg",
  lerato: "/images/landing/spotlight-lerato.jpg",
};

export const SAMPLE_PROFILES = [
  {
    image: IMG.thandi,
    name: "Sample profile",
    role: "Fashion personal shopper",
    scope: "Clothing, footwear and accessories",
    checks: ["Identity", "Address", "Receiving account", "Instagram and WhatsApp channels"],
  },
  {
    image: IMG.nomsa,
    name: "Sample profile",
    role: "Sourcing trader",
    scope: "Imported homeware and décor",
    checks: ["Identity", "Business registration", "Receiving account", "Online store and WhatsApp"],
  },
  {
    image: IMG.lerato,
    name: "Sample profile",
    role: "Gifting and occasion shopper",
    scope: "Gift hampers and event shopping",
    checks: ["Identity", "Address", "Receiving account", "Facebook and WhatsApp channels"],
  },
];

export const TRUST_TICKER = [
  "Identity verified",
  "Address confirmed",
  "Receiving account confirmed by the bank",
  "Trading channels controlled",
  "Conduct assessment passed",
  "Two-person approval",
  "Live status on PSSA.site",
  "Free concern reviews",
];

export const SHOPPER_TYPES: { icon: IconName; title: string; text: string; image: string; tag: string }[] = [
  {
    icon: "user",
    tag: "Personal shopper",
    title: "Buys on your behalf",
    text: "You describe what you want. They find it in store or online, buy it, and get it to your door. Some act as your purchasing agent, others sell to you directly.",
    image: IMG.boutique,
  },
  {
    icon: "people",
    tag: "Sourcing trader",
    title: "Finds what's hard to find",
    text: "Sourcing traders track down stock from markets, wholesalers and overseas suppliers, then sell or import it for customers across South Africa.",
    image: IMG.market,
  },
  {
    icon: "home",
    tag: "You, the customer",
    title: "Gets it without the legwork",
    text: "No queues, no hunting, no customs headaches. You often pay before you see the goods, which is exactly why it matters who you're paying.",
    image: IMG.customer,
  },
];

export const TRUST_GAP = {
  without: [
    { title: "A screenshot of a “certificate”", text: "Easy to fake, impossible to check, and no proof the person is still trading honestly." },
    { title: "An account in someone else's name", text: "You're asked to pay a stranger and hope the money reaches the shopper." },
    { title: "Terms agreed in a voice note", text: "No written record of the goods, the price, delivery or refunds when something goes wrong." },
    { title: "Nowhere to turn", text: "If the order never arrives, you're left arguing in the DMs." },
  ],
  with: [
    { title: "A live status you can check", text: "Search the register or follow the badge to the member's live page on PSSA.site." },
    { title: "A receiving account confirmed by the bank", text: "Members prove the account they use is theirs before they are approved." },
    { title: "A written order before you pay", text: "Our free order template covers the goods, every charge, delivery, cancellation and refunds." },
    { title: "A free, fair concern process", text: "We review the evidence, hear the member and give both sides written reasons and an appeal route." },
  ],
};

export const CHECKS: { icon: IconName; title: string; text: string }[] = [
  { icon: "user", title: "Identity", text: "A valid ID or passport, checked and recorded by a verification officer." },
  { icon: "home", title: "Address", text: "Proof of address, usually dated within the last three months." },
  { icon: "bank", title: "Receiving account", text: "A bank-issued confirmation that the account customers pay into belongs to the applicant." },
  { icon: "eye", title: "Trading channels", text: "Proof that the applicant controls every Instagram, WhatsApp, Facebook or web channel they list." },
  { icon: "book", title: "Conduct assessment", text: "30 questions on advertising, sourcing, payments, delivery, privacy and complaints. Pass mark: 80%." },
  { icon: "people", title: "Two-person approval", text: "A second authorised reviewer signs off. Nobody approves their own application." },
  { icon: "badge", title: "Live certificate", text: "A certificate number, scope and dates, linked to a live status page that updates the moment anything changes." },
];

export const GATES: { title: string; text: string; points: string[]; note?: string }[] = [
  {
    title: "Apply with evidence",
    text: "Complete the questionnaire and submit the evidence for your route: individual or sole trader, registered business, overseas applicant or new trader.",
    points: [
      "Valid ID or passport",
      "Proof of address, usually dated within three months",
      "Bank-issued confirmation of your receiving account",
      "Proof that you control each trading channel you list",
    ],
  },
  {
    title: "Verification checks",
    text: "A verification officer checks and records every item. Uploading a document is not the same as passing a check.",
    points: [
      "A second reviewer confirms activation and high-risk exceptions",
      "We never ask for passwords, PINs or one-time codes",
      "No reviewer approves their own application",
      "Adverse decisions come with reasons and an appeal route",
    ],
  },
  {
    title: "Conduct assessment",
    text: "Every applicant, and every customer-facing representative of a business, passes the assessment before being covered.",
    points: [
      "30 questions in 45 minutes",
      "At least 80% overall and every critical question correct",
      "Advertising, sourcing, authenticity, payments, delivery, customer care, privacy and complaints",
      "One retake after at least seven days",
    ],
    note: "Proposed rules, pending board adoption.",
  },
  {
    title: "Approval and live certificate",
    text: "Two authorised people approve each member. The certificate shows your number, scope and dates, and links to your live status.",
    points: [
      "Membership lasts 12 months",
      "Renewal includes updated checks and a refresher assessment",
      "Reminders 60, 30 and 7 days before expiry",
      "At expiry, active status ends immediately",
    ],
  },
];

export const ANATOMY: { id: string; label: string; title: string; text: string }[] = [
  { id: "name", label: "1", title: "Who you're dealing with", text: "The member's name and trading name, exactly as verified. If the name in the DMs doesn't match, stop." },
  { id: "number", label: "2", title: "Certificate number", text: "Every certificate has a unique number in the format PSSA-YYYY-XXXXXX, and it links to exactly one live page on PSSA.site." },
  { id: "scope", label: "3", title: "Scope", text: "What the member is approved to do. A shopper approved for clothing isn't vetted for electronics imports." },
  { id: "dates", label: "4", title: "Valid dates", text: "Membership lasts 12 months. Once it expires, active status ends immediately." },
  { id: "status", label: "5", title: "Live status", text: "Read straight from the register on PSSA.site, never from a screenshot. Suspended or expired shows the moment it changes." },
];

export const CUSTOMER_STEPS: { icon: IconName; title: string; text: string; screen: { label: string; value: string; tone: "ok" | "info" | "warn" }[] }[] = [
  {
    icon: "search",
    title: "Search the register",
    text: "Type the shopper's name or business name. Only active members appear. Screenshots and old certificates don't prove current approval.",
    screen: [
      { label: "Search", value: "Name or business name", tone: "info" },
      { label: "Result", value: "Active member", tone: "ok" },
      { label: "Shown", value: "Professional details only", tone: "info" },
    ],
  },
  {
    icon: "user",
    title: "Know who you're buying from",
    text: "Ask whether the shopper is selling the goods to you, or buying them for you as your purchasing agent. It changes who is responsible for what.",
    screen: [
      { label: "Role", value: "Seller or purchasing agent?", tone: "info" },
      { label: "Scope", value: "Matches what you're buying", tone: "ok" },
      { label: "Channel", value: "Listed on their profile", tone: "ok" },
    ],
  },
  {
    icon: "file",
    title: "Get it in writing",
    text: "Agree a written order before you pay: your trader, the exact goods, all charges, delivery, cancellation and refund terms.",
    screen: [
      { label: "Goods", value: "Exact item, size, colour", tone: "ok" },
      { label: "Charges", value: "Price, fees, shipping, duties", tone: "ok" },
      { label: "Terms", value: "Delivery, cancellation, refunds", tone: "ok" },
    ],
  },
  {
    icon: "flag",
    title: "Speak up if something's wrong",
    text: "Report misconduct, impersonation or badge misuse. Raising a concern is free, and you'll get reasons and an appeal route.",
    screen: [
      { label: "Concern", value: "Free of charge", tone: "ok" },
      { label: "Acknowledged", value: "Within 2 business days", tone: "info" },
      { label: "Impersonation", value: "Report it", tone: "warn" },
    ],
  },
];

export const STATUSES = [
  {
    key: "active",
    label: "Active",
    text: "Approval is current, within the listed scope and dates.",
    dot: "bg-green",
    chip: "bg-green/15 text-green border-green/30",
    glow: "rgba(24,162,105,0.45)",
  },
  {
    key: "suspended",
    label: "Suspended",
    text: "Approval is temporarily inactive while a review takes place. We publish a neutral status, never a label.",
    dot: "bg-green",
    chip: "bg-green/15 text-green-soft border-green/30",
    glow: "rgba(24,162,105,0.45)",
  },
  {
    key: "ended",
    label: "Expired, revoked or resigned",
    text: "Not an active member. The right to use the badge has ended.",
    dot: "bg-white/40",
    chip: "bg-white/10 text-white/70 border-white/20",
    glow: "rgba(255,255,255,0.18)",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    text: "Status can't be confirmed right now. An old result is never shown as active.",
    dot: "bg-sky-400",
    chip: "bg-sky-400/15 text-sky-200 border-sky-300/30",
    glow: "rgba(56,189,248,0.35)",
  },
];

export const AUDIENCES: { tag: string; title: string; text: string; image: string; cta: { label: string; to: string } }[] = [
  {
    tag: "For personal shoppers",
    title: "Turn trust into your edge.",
    text: "A public listing, a certificate customers can check live and standards that set you apart from the accounts that disappear overnight.",
    image: IMG.boutique,
    cta: { label: "Apply to join", to: "/member" },
  },
  {
    tag: "For sourcing traders",
    title: "Prove you're the real deal.",
    text: "Show customers the account they pay into is yours, the channels are yours, and that you've passed a conduct assessment on sourcing and authenticity.",
    image: IMG.market,
    cta: { label: "See the four gates", to: "/#membership" },
  },
  {
    tag: "For customers",
    title: "Shop with certainty.",
    text: "Check a shopper in seconds, get your order in writing and know there's a free, fair process if something goes wrong.",
    image: IMG.customer,
    cta: { label: "Check a shopper", to: "/register" },
  },
];

export const WHY_JOIN: { icon: IconName; text: string }[] = [
  { icon: "badge", text: "A listing in the public member register once you are approved" },
  { icon: "shield", text: "A certificate customers can check live, instead of trusting a screenshot" },
  { icon: "people", text: "Standards that apply equally to everyone; fees never buy approval" },
  { icon: "book", text: "Clear rules for advertising, sourcing, payments and customer care" },
];

export const BUY_SAFELY: { icon: IconName; text: string }[] = [
  { icon: "search", text: "Check the member register before you pay. Screenshots and old certificates don't prove current approval." },
  { icon: "file", text: "Get a written order: your trader, the exact goods, all charges, delivery, cancellation and refund terms." },
  { icon: "user", text: "Confirm whether the shopper sells the goods or buys them for you as your purchasing agent." },
  { icon: "flag", text: "Report misconduct, impersonation or badge misuse. Raising a concern is free." },
];

export const STAGES = [
  { title: "Acknowledged", time: "Within 2 business days", label: "Intake" },
  { title: "Triage", time: "Normally within 5 business days", label: "Evidence check" },
  { title: "Member responds", time: "5 business days", label: "Right of reply" },
  { title: "Outcome", time: "Aim: within 30 business days", label: "Written reasons" },
  { title: "Appeal", time: "File within 10 business days", label: "Independent review" },
];

export const POLICIES = [
  { slug: "code-of-conduct", title: "Code of Conduct", text: "The rules members follow on social media, websites and in private messages.", tag: "Conduct" },
  { slug: "verification", title: "Verification Standard", text: "How we check identity, address, banking, authority and trading channels.", tag: "Vetting" },
  { slug: "certification", title: "Certification and Renewal", text: "The assessment, 12-month membership and annual renewal.", tag: "Renewal" },
  { slug: "complaints", title: "Complaints and Appeals", text: "How concerns are handled, timelines, decisions and appeals.", tag: "Disputes" },
  { slug: "privacy", title: "Privacy and Retention", text: "What we collect, why, who can see it and how long we keep it.", tag: "Privacy" },
  { slug: "badge-rules", title: "Badge and Certificate Rules", text: "Who may display the badge, and how to report misuse.", tag: "Trust mark" },
  { slug: "independence", title: "Independence and Fees", text: "Fees are kept separate from approval and disciplinary decisions.", tag: "Governance" },
  { slug: "order-template", title: "Customer Order Template", text: "A blank written order to agree with your shopper before you pay.", tag: "Template" },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "What exactly does PSSA do?",
    a: "PSSA is a voluntary membership association for personal shoppers and sourcing traders. We verify who members are, how they trade, the receiving accounts they use and the channels they control. Members pass a conduct assessment, and customers can check their live status at any time.",
  },
  {
    q: "Is PSSA the seller? Do you guarantee my order?",
    a: "No. You buy directly from the member. Membership does not make PSSA the seller or guarantee a transaction, and we can't guarantee repayment or replace the police, courts or consumer bodies. What we do is make sure the person you're paying has been checked, and give you a fair process if something goes wrong.",
  },
  {
    q: "How do I check if a shopper is a member?",
    a: "Search their name or business name in the member register on this page, or follow the badge on their profile to their live page on PSSA.site. If they aren't listed, they are not currently an active member.",
  },
  {
    q: "Someone sent me a screenshot of their PSSA certificate. Is that enough?",
    a: "No. Screenshots and old certificates don't prove current approval. Always check the live register. If someone claims to be a member and isn't listed, please report it.",
  },
  {
    q: "Does it cost anything to raise a concern?",
    a: "No, raising a concern is free. We acknowledge it, review the evidence, give the member a chance to respond and send both sides written reasons with an appeal route.",
  },
  {
    q: "What will customers see about me if I join?",
    a: "Only professional details, such as your name, trading name, scope, certificate dates and live status. ID numbers, banking evidence and home addresses are never shown publicly.",
  },
  {
    q: "Can I pay to get approved faster?",
    a: "No. Fees are kept separate from approval and disciplinary decisions, and the same standards apply to founders, sponsors and every applicant.",
  },
  {
    q: "How long does membership last?",
    a: "Membership lasts 12 months. Renewal includes updated checks and a refresher assessment, with reminders 60, 30 and 7 days before expiry. At expiry, active status ends immediately.",
  },
];
