import type { Dictionary } from "@/lib/i18n/ru";

/**
 * Английский словарь. Форма — та же, что у русского (тип `Dictionary`):
 * забытая строка не даст собрать сайт.
 *
 * Имя латиницей — «Berlant Dzhabrailova», по стандартной транслитерации.
 * ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ: если в загранпаспорте художницы другое написание
 * (например, Jabrailova), поменять здесь, в `site.artist`.
 *
 * Названия картин не переводятся — решение заказчика от 4 октября 2026:
 * английских полей в админке нет, название остаётся именем собственным.
 * Переводятся только категории и техника — словарём ниже.
 */
const enOrdinals = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
];

export const en: Dictionary = {
  site: {
    artist: "Berlant Dzhabrailova",
    slogan: "Art has no purpose!",
    description: "Artist from the Chechen Republic. Oil painting since 2020.",
    location: "Grozny, Chechen Republic",
    defaultTitle: "Berlant Dzhabrailova — Chechen artist, oil paintings",
    metaDescription:
      "Chechen artist from Grozny painting the mountains, ancient towers and villages of Chechnya in oils and with a palette knife. Original paintings for sale or commission.",
    ogTitle: "Berlant Dzhabrailova — Chechen artist, oil paintings",
    artistGenitive: "Berlant Dzhabrailova",
    ogImageAlt: "Berlant Dzhabrailova painting with a palette knife in her studio",
    jobTitle: "Artist",
    region: "Chechen Republic",
    artform: "Painting",
  },

  nav: {
    home: "Home",
    gallery: "Gallery",
    about: "About",
    contact: "Contact",
    cta: "Commission a painting",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    theme: "Switch room: light or dark",
    themeTitle: "Light or dark room",
    language: "Language",
    switchTo: "Русский",
    switchToLabel: "Перейти на русский",
  },

  footer: {
    sections: "Sections",
    contacts: "Contact",
    write: "Get in touch →",
    rights: (year, artist) => `© ${year} ${artist}. All rights to the images belong to the artist.`,
    privacy: "Privacy policy",
  },

  hero: {
    kicker: "Portfolio",
    photoAlt:
      "Berlant Dzhabrailova lays a stroke on a canvas with a tower using a palette knife; a palette and oil paint tubes beside her",
    story: (year) =>
      `Chechen artist from Grozny. She picked up a brush in 2020, at 53, with no art school and not a single drawing lesson. She paints in oils every day — now in her ${year} year.`,
    yearOrdinal: (n) => enOrdinals[n - 1] ?? `${n}th`,
    toGallery: "View gallery",
    toAbout: "About the artist",
  },

  home: {
    wallKicker: "From the studio",
    wallTitle: "Works",
    allGallery: "Full gallery →",
    empty: "Works for the home page haven't been chosen yet. All paintings are in the gallery.",
    seeAll: "See the full gallery →",
  },

  gallery: {
    title: "Works",
    metaTitle: "Original oil paintings for sale",
    metaDescription:
      "Original oil paintings by Chechen artist Berlant Dzhabrailova: mountains, towers, villages and rivers of Chechnya. Price and availability on every painting.",
    kicker: "Gallery",
    lead: "Oil painting. Tap a work to open it full screen.",
    emptyFilteredTitle: "Nothing matches this filter",
    emptyFilteredText: "Try another status or category.",
    emptyTitle: "No works yet",
    emptyText: "Paintings will appear here as soon as the artist adds them.",
    filterStatus: "Filter by status",
    filterCategory: "Filter by category",
    statusAll: "All",
    statusAvailable: "Available",
    statusSold: "Sold",
    categoryAll: "All categories",
  },

  status: {
    RESERVED: "Reserved",
    SOLD: "Sold",
  },

  categories: {
    Горы: "Mountains",
    Башни: "Towers",
    "Поле и дорога": "Fields and roads",
    "Деревья и лес": "Trees and forest",
    Село: "Village",
    "Река и мост": "Rivers and bridges",
    Цветы: "Flowers",
    "Старая архитектура": "Old architecture",
    Натюрморт: "Still life",
    Другое: "Other",
  },

  techniques: {
    "Холст, масло": "Oil on canvas",
  },

  work: {
    notFound: "Work not found",
    fallbackKicker: "Painting",
    backToAll: "← All works",
    tryOnWall: "Try it on a wall",
    writeEmail: "Send an email",
    whatsappHint: (action) => `“${action}” opens WhatsApp with a ready message`,
    seeMore: "See more ↓",
    otherAngles: "Other views",
    otherWorks: "Other works",
    allGallery: "Full gallery →",
    mailSubject: (title) => `Painting “${title}”`,
    navLabel: "Browse works",
    prev: (title) => `Previous work: “${title}”`,
    next: (title) => `Next work: “${title}”`,
    openFullscreen: (title) => `Open “${title}” full screen`,
    fullscreen: "Full screen",
    closeViewer: "Close viewer",
  },

  seo: {
    oilPainting: "oil painting",
    painting: "painting",
    workTitle: (title, kind, size) => (size ? `${title} — ${kind}, ${size}` : `${title} — ${kind}`),
    workDescription: (title, details) => (details ? `“${title}”: ${details}.` : `“${title}”.`),
    byArtist: (artist) => `By Chechen artist ${artist}.`,
    price: (price) => `Price ${price}.`,
    status: { AVAILABLE: "Available.", RESERVED: "Reserved.", SOLD: "Sold." },
    imageAlt: (title, kind, artistGenitive) => `“${title}” — ${kind} by ${artistGenitive}`,
  },

  purchase: {
    soldLabel: "Message on WhatsApp",
    soldMessage: (title, url) => `Hello! I'm interested in the painting “${title}”. ${url}`,
    reservedLabel: "Ask about it",
    reservedMessage: (title, url) => `Hello! Is the painting “${title}” still reserved? ${url}`,
    noPriceLabel: "Ask the price",
    noPriceMessage: (title, url) => `Hello! How much is the painting “${title}”? ${url}`,
    buyLabel: "Buy",
    buyMessage: (title, price, url) =>
      `Hello! I would like to buy the painting “${title}” for ${price}. ${url}`,
  },

  contacts: {
    phone: "Phone",
    email: "Email",
    write: "Message",
    call: "Call",
    seeWorks: "See works",
    openPage: "Open page",
    writeEmail: "Send an email",
  },

  contactPage: {
    title: "Contact",
    metaTitle: "Buy or commission a painting",
    metaDescription:
      "Buy an original or commission a painting from Chechen artist Berlant Dzhabrailova. WhatsApp, phone, Instagram. Grozny, Chechen Republic.",
    kicker: "Contact",
    heading: "Commission a painting",
    lead: "Buy a finished work, commission a painting or just ask a question — write or call in whatever way suits you.",
    whatsapp: "Message on WhatsApp",
    photoAlt: "Berlant Dzhabrailova at her easel",
    ways: "Ways to get in touch",
    formTitle: "Send a message",
    formLead: "Fill it in and the message opens ready to go — all that's left is to send it.",
    studio: "Studio",
  },

  contactForm: {
    topics: [
      { label: "Buying", value: "Buying a work" },
      { label: "Commission", value: "Commissioning a painting" },
      { label: "Other", value: "Other" },
    ],
    nameRequired: "Please tell us how to address you.",
    messageRequired: "Please tell us what you're interested in.",
    text: (name, topic, message) => `Hello! My name is ${name}.\nTopic: ${topic}.\n\n${message}`,
    subject: (topic) => `${topic} — message from the website`,
    name: "Your name",
    topic: "Topic",
    message: "Message",
    placeholder: "Which work you liked, what size you need, by when",
    sendWhatsapp: "Send via WhatsApp",
    sendEmail: "Send by email",
    privacyBefore: (channel) =>
      `The message is not sent or stored by the website: ${channel} opens with the text ready, and you send it yourself. More in the `,
    privacyLink: "privacy policy",
    channelMail: "your email app",
  },

  notFound: {
    title: "Page not found",
    code: "Error 404",
    heading: "This page doesn't exist",
    text: "There may be a typo in the address — or the work the link led to is no longer on display.",
    toGallery: "See works",
    toHome: "Home page",
  },

  error: {
    heading: "The page didn't open",
    text: "Something went wrong on our side. Trying again usually helps — the data may not have responded in time.",
    retry: "Try again",
    toHome: "Home page",
    code: "Error code:",
  },

  about: {
    title: "About the artist",
    metaTitle: "An artist who started at 53",
    metaDescription:
      "Berlant Dzhabrailova from Grozny picked up a brush at 53, with no art school, and has painted in oils every day since. The story of a Chechen artist.",
    portraitAlt:
      "Berlant Dzhabrailova lays a stroke on a canvas with a tower using a palette knife; books and finished mountain landscapes behind her",
    tag: "About the artist",
    heading: "A path that began at 53",
    intro: [
      "On her birthday in 2020, Berlant Dzhabrailova bought a small canvas and a set of oil paints. She was turning fifty-three. She had no art school behind her, no drawing lessons — not even the habit of holding a brush. She simply wanted to try.",
      "The first painting turned out well enough not to be put away in a cupboard. Today it belongs to a friend of her son's, who is proud that Berlant's first work went to him.",
    ],
    pathTitle: "Her path",
    milestones: [
      {
        label: "Before 2020",
        title: "A different life",
        text: "She comes from the village of Goyty. After the war she lived in Turkey, then in Moscow, and only in 2013 returned to the Chechen Republic — her home has been in Grozny ever since. All her earlier life she was an entrepreneur, and neither she nor her family ever thought about painting.",
      },
      {
        label: "2020",
        title: "The first canvas",
        text: "She bought a canvas and paints on her birthday — and began painting every day. Seeing her first works, her family asked her not to stop.",
      },
      {
        label: "Today",
        title: "A style of her own",
        text: "With no training and no experience, Berlant has found a manner of her own — with a brush and a palette knife — and paints every day, now in her {year} year. A few years ago nobody would have believed it — neither she herself nor those who knew her.",
      },
    ],
    giftTitle: "A gift she didn't know she had",
    gift: [
      "In 2017 she lost her husband, and those years were hard. Three years passed between the loss and the first canvas. Paint came where words fell short: what she had lived through and left unsaid began to settle on the canvas as colour.",
      "Berlant herself explains it simply: all her life she saw the world in her own way — telling shades apart where others see a single colour, and composing what she saw into pictures in her head. She just didn't know it was a gift, or that it could be put on canvas. That is why it worked straight away, without any school: it was her hand that had to learn — her eye had been ready for a long time.",
    ],
    studioAlt:
      "Berlant Dzhabrailova lays a stroke on a canvas with a tower using a palette knife; a palette and oil paint tubes beside her",
    subjectsTitle: "What she paints",
    subjects: [
      "In oils — with a brush and a palette knife. Her subjects: Chechen towers, old architecture, things with a story behind them. She doesn't paint still lifes.",
      "She has no separate studio — there is a room that became one. She works every day: ideas come in waves, and then she paints for hours on end, not stopping until she lets go of what she has begun.",
    ],
    motto:
      "Berlant heard this phrase in a film — and recognised herself in it. She sets herself no goal: she doesn't paint for exhibitions, sales or recognition. She paints because it brings her fulfilment.",
    quote: (slogan) => `“${slogan}”`,
    latestTitle: "Latest works",
    seeAll: "See all works",
  },

  // Перевод русской политики, без новых утверждений. Показать юристу.
  privacy: {
    title: "Privacy policy",
    metaDescription:
      "How personal data is handled on Berlant Dzhabrailova's website: the site collects nothing; data appears only when you write to the artist. Your rights and time limits.",
    kicker: "Documents",
    revised: "Version of 8 October 2026",
    operator: "Dzhabrailova Berlant Shakhidovna",
    city: "Grozny, Chechen Republic",
    noEmail: "any of the contacts below",
    sections: [
      {
        title: "In brief",
        paragraphs: [
          "The website does not collect or store your data. The form on the Contact page and the Buy and Message buttons send nothing to the website's server: they open WhatsApp or your email app with a ready text, and you decide yourself whether to send it. The artist receives your data only when you write to her.",
        ],
      },
      {
        title: "1. General provisions",
        paragraphs: [
          "This policy describes how the personal data of visitors to www.berlant-art.com and of people who write to the artist is processed, in accordance with Russian Federal Law No. 152-FZ of 27 July 2006 “On Personal Data”. The policy is publicly available so that you can read it before you write.",
        ],
      },
      {
        title: "2. Who processes the data",
        paragraphs: [
          "The personal data operator is {operator}, a private individual, {city}.",
          "Questions and requests about personal data are accepted by email at {email}. Other ways to get in touch:",
        ],
        withContacts: true,
      },
      {
        title: "3. What data is processed",
        paragraphs: ["Only what you provide yourself when you write to the artist:"],
        list: [
          "the name you give;",
          "the phone number, email address or account name you write from;",
          "the text of your message and the details in it — for example, which painting interests you.",
        ],
        after: [
          "Special categories of personal data and biometric data are not processed. Children's data is not knowingly collected.",
          "Vercel, the hosting provider the website runs on, automatically records technical information about requests — IP address, browser type, time of access. This is needed to run and protect the website and is stored by Vercel under its own rules; the artist does not access it.",
        ],
      },
      {
        title: "4. Purposes and legal grounds",
        paragraphs: [
          "Data from messages is used to reply to you, to arrange the purchase of a finished painting or the commission of a new one, and to carry out the arrangement: agree on payment and hand over the painting.",
          "The legal ground is the conclusion and performance of a contract that you initiate or are a party to (Art. 6(1)(5) of Law No. 152-FZ). No separate consent is required for this: you start the correspondence yourself.",
          "Hosting logs are processed to run and protect the website (Art. 6(1)(7) of Law No. 152-FZ).",
        ],
      },
      {
        title: "5. What happens to the data",
        paragraphs: [
          "The data is collected (when you write), recorded, stored, used to reply and to make the arrangement, and deleted. Processing is automated — through the messenger and email — within the correspondence you started.",
          "The data is not passed on to third parties, not sold, and not used for mailings or advertising. No decisions are made based solely on automated processing.",
        ],
      },
      {
        title: "6. Transfer of data abroad",
        paragraphs: [
          "Correspondence takes place through the service you choose yourself: WhatsApp, Instagram or email. WhatsApp and Instagram are foreign services whose servers are located outside Russia, and their rules apply to the correspondence. By choosing a way to get in touch, you also choose the service through which your data is transferred.",
        ],
      },
      {
        title: "7. How long the data is kept",
        paragraphs: [
          "For as long as the correspondence and the arrangement last, and after that for no more than three years from the last message — in case you come back with a question about a painting you bought. The correspondence is then deleted.",
          "At your request, the data is deleted sooner, unless keeping it is required by law — for example, to confirm a payment.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: ["You have the right to:"],
        list: [
          "find out which of your data is processed, why, and for how long it is kept;",
          "ask for your data to be corrected, blocked or deleted if it is incomplete, out of date or no longer needed for its purpose;",
          "withdraw consent, if processing was based on it;",
          "appeal against the operator's actions to Roskomnadzor (rkn.gov.ru) or in court.",
        ],
        after: [
          "To exercise a right, write to {email}. You will receive a reply within 10 working days of the request; this may be extended by another 5 working days with an explanation.",
        ],
      },
      {
        title: "9. How the data is protected",
        paragraphs: [
          "Only the artist has access to the correspondence. The phone and the mailbox that receive messages are password-protected; data from the correspondence is not transferred to other systems.",
        ],
      },
      {
        title: "10. Cookies and browser storage",
        paragraphs: [
          "The website has no advertising or analytics cookies and does not track visitors. One setting is saved in your browser — the room you chose, light or dark — and it never leaves your device. A login cookie is set only for the artist, when she signs in to the website's admin panel.",
          "Fonts and images are loaded from the website's own address, without requests to Google or other companies' services.",
        ],
      },
      {
        title: "11. Images of the works",
        paragraphs: [
          "All rights to the paintings and their images belong to the artist. They may not be copied or used without the artist's permission. If you would like to publish a work, write and you will get a reply.",
        ],
      },
      {
        title: "12. Prices and purchase",
        paragraphs: [
          "Information about works and prices on the website is for reference only and does not constitute a public offer. Terms of purchase — price, payment and delivery — are agreed in correspondence with the artist.",
        ],
      },
      {
        title: "13. Changes",
        paragraphs: [
          "If the way the website works changes, this policy will change too; the version date is shown at the top of the page.",
        ],
        contactLink: "Back to contact",
      },
    ],
  },

  room: {
    title: (title) => `Try on a wall: “${title}”`,
    cameraTitle: (title) => `With your camera: “${title}”`,
    tabs: { painting: "Painting", frame: "Frame", wall: "Wall" },
    cm: "cm",
    canvas: "Canvas",
    framed: "Framed",
    canvasSize: (size) => `Canvas ${size}`,
    framedSize: (size) => `framed ${size}`,
    noSize: "The painting's size isn't specified, so it can't be shown next to the sofa",
    modes: "Fitting mode",
    modeCamera: "Camera",
    modeWall: "On the wall",
    label: (title) => `Try on a wall: “${title}”`,
    back: "Back to work",
    howItWorks: "How it works",
    otherPainting: "Another painting",
    about: "About the painting",
    writeWhatsapp: "Message about this painting on WhatsApp",
    close: "Close",
    settings: "Settings",
    otherWorks: "Other works",
    settingsLabel: "Room settings",
    hideSettings: "Hide settings",
    kickerCamera: "Try with your camera",
    kicker: "Try on a wall",
    eveningLabel: "Evening light, lamp above the painting",
    eveningTitle: "Evening, lamp",
    dayTitle: "Day",
    backToPainting: "Back to the painting",
    viewFromAfar: "View from afar, next to a sofa",
    frame: "Frame",
    frameSummary: (label, width, finish) => `${label}, ${width} cm · ${finish}`,
    canvasOnly: "canvas",
    frameWidth: (width) => `${width} cm`,
    frameColor: "Frame colour",
    noCarving: "The camera view won't show carving on the frame — only its shape and colour.",
    wall: "Wall",
    openCamera: "Open camera",
    cameraLead:
      "The painting will appear on your wall at its real size — before the camera opens, we'll show you how to point your phone.",
    write: "Message about this painting",
    toolbar: "Try on a wall",
    eveningToDay: "Evening, switch to day",
    dayToEvening: "Day, switch to evening",
    evening: "Evening",
    day: "Day",
    closer: "Closer to the painting",
    afar: "View from afar, with a 210 cm sofa",
    closerShort: "Closer",
    afarShort: "Afar",
    sofaCredit: "Sofa — 3D model made with",
    frames: {
      none: { label: "No frame", note: "canvas on a stretcher" },
      thin: { label: "Slim", note: "aluminium, smooth" },
      floater: { label: "Floater", note: "wood, box frame with a gap" },
      modern: { label: "Modern", note: "wood, bead by the canvas" },
      reverse: { label: "Reverse profile", note: "wood, rising toward the canvas" },
      classic: { label: "Classic moulding", note: "wood, carved band" },
      baroque: { label: "Baroque", note: "wood with ornament, two carved bands" },
    },
    finishes: {
      gold: "Gold",
      "old-gold": "Antique gold",
      silver: "Silver",
      bronze: "Bronze",
      "oak-light": "Light oak",
      oak: "Oak",
      walnut: "Walnut",
      wenge: "Wenge",
      cherry: "Cherry",
      white: "White",
      black: "Black",
      graphite: "Graphite",
      navy: "Navy",
      burgundy: "Burgundy",
      olive: "Olive",
    },
    walls: {
      white: { label: "White", phrase: "on a white wall" },
      beige: { label: "Beige", phrase: "on a beige wall" },
      grey: { label: "Grey", phrase: "on a grey wall" },
      olive: { label: "Olive", phrase: "on an olive wall" },
      terracotta: { label: "Terracotta", phrase: "on a terracotta wall" },
      graphite: { label: "Graphite", phrase: "on a graphite wall" },
    },
    messageNoFrame: "without a frame",
    messageFramed: (frame, finish) => `in the “${frame}” frame, ${finish.toLowerCase()}`,
    messageCamera: "on my own wall, with the camera",
    message: (title, framing, where, url) =>
      `Hello! I'm interested in the painting “${title}”. I'm looking at it ${framing}, ${where}. ${url}`,
  },

  ar: {
    steps: [
      {
        title: "Stand facing the wall",
        text: "One and a half to two metres away, in good light. Hold the phone level, at eye height.",
      },
      {
        title: "Move the phone slowly",
        text: "Left and right along the wall. While the painting is see-through, the phone is looking for the wall — it turns solid once it finds it.",
      },
      {
        title: "Move it with your finger",
        text: "Drag the painting to choose its place. The size doesn't change — it's real.",
      },
    ],
    kicker: "Try with your camera",
    plainWall:
      "A plain wall takes longer to find — include a switch, a corner or the edge of furniture in the frame.",
    open: "Got it, open camera",
    close: "Close",
    noArcore: "Camera try-on doesn't work on this phone: it needs Google Play Services for AR.",
    desktop: "The camera works only on a phone: open this page on an iPhone or Android.",
    inApp: "The camera opens only in Safari: tap “…” and “Open in browser”.",
    action: "Message about this painting",
  },
};
