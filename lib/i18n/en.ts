import { enUi } from "@/lib/i18n/en-ui";
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
  ...enUi,

  footer: {
    sections: "Sections",
    contacts: "Contact",
    write: "Get in touch →",
    rights: (year, artist) => `© ${year} ${artist}. All rights to the images belong to the artist.`,
    privacy: "Privacy policy",
  },

  hero: {
    motto: { lead: "Art has", accent: "no purpose!" },
    subline: "First canvas at 53. She has painted every day since.",
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

  categories: {
    Горы: "Mountains",
    Башни: "Towers",
    "Поле и дорога": "Fields and roads",
    "Деревья и лес": "Trees and forest",
    Село: "Village",
    "Река и мост": "Rivers and bridges",
    Море: "Sea",
    Цветы: "Flowers",
    "Старая архитектура": "Old architecture",
    Натюрморт: "Still life",
    Другое: "Other",
  },

  techniques: {
    "Холст, масло": "Oil on canvas",
  },

  seo: {
    oilPainting: "oil painting",
    painting: "painting",
    workTitle: (title, kind, size) => (size ? `${title} — ${kind}, ${size}` : `${title} — ${kind}`),
    workDescription: (title, details) => (details ? `“${title}”: ${details}.` : `“${title}”.`),
    byArtist: (artist) => `By Chechen artist ${artist}.`,
    imageAlt: (title, kind, artistGenitive) => `“${title}” — ${kind} by ${artistGenitive}`,
  },

  contactPage: {
    title: "Contact",
    metaTitle: "Contact the artist",
    metaDescription:
      "Write to Chechen artist Berlant Dzhabrailova: WhatsApp, phone, Instagram. Questions about the paintings go straight to the artist. Grozny, Chechen Republic.",
    kicker: "Contact",
    heading: "Write to the artist",
    lead: "Ask about a painting, tell her which work you liked or simply share your impression — write or call in whatever way suits you.",
    whatsapp: "Message on WhatsApp",
    photoAlt: "Berlant Dzhabrailova at her easel",
    ways: "Ways to get in touch",
    formTitle: "Send a message",
    formLead: "Fill it in and the message opens ready to go — all that's left is to send it.",
    studio: "Studio",
  },

  notFound: {
    title: "Page not found",
    code: "Error 404",
    heading: "This page doesn't exist",
    text: "There may be a typo in the address — or the work the link led to is no longer on display.",
    toGallery: "See works",
    toHome: "Home page",
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
        text: "After the war she lived in Turkey, then in Moscow, and only in 2013 returned to the Chechen Republic — her home has been in Grozny ever since. She speaks Turkish. All her earlier life she was an entrepreneur, and neither she nor her family ever thought about painting.",
      },
      {
        label: "2020",
        title: "The first canvas",
        text: "She bought a canvas and paints on her birthday — and began painting every day. Seeing her first works, her family asked her not to stop.",
      },
      {
        label: "Today",
        title: "A style of her own",
        text: "With no art training and no experience, Berlant has found a manner of her own — with a brush and a palette knife — and paints every day, now in her {year} year. A few years ago nobody would have believed it — neither she herself nor those who knew her.",
      },
    ],
    giftTitle: "A gift she didn't know she had",
    gift: [
      "In 2017 she lost her husband, and those years were hard. Three years passed between the loss and the first canvas. Paint came where words fell short: what she had lived through and left unsaid began to settle on the canvas as colour.",
      "Berlant herself explains it simply: all her life she saw the world in her own way — telling shades apart where others see a single colour, and composing what she saw into pictures in her head. She just didn't know it was a gift, or that it could be put on canvas. That is why it worked straight away, without any art school: it was her hand that had to learn — her eye had been ready for a long time.",
    ],
    studioAlt:
      "Berlant Dzhabrailova lays a stroke on a canvas with a tower using a palette knife; a palette and oil paint tubes beside her",
    subjectsTitle: "What she paints",
    subjects: [
      "In oils — with a brush and a palette knife. Her subjects: Chechen towers, old architecture, things with a story behind them.",
      "She has her own studio and works there every day: ideas come in waves, and then she paints for hours on end, not stopping until she lets go of what she has begun.",
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
          "The website does not collect or store your data. The form on the Contact page and the “Message the artist” and “Send an email” buttons send nothing to the website's server: they open WhatsApp or your email app with a ready text, and you decide yourself whether to send it. The artist receives your data only when you write to her.",
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
          "Data from messages is used to reply to you and, if you and the artist agree on something, to carry out that arrangement.",
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
          "For as long as the correspondence and the arrangement last, and after that for no more than three years from the last message — in case you come back to the conversation. The correspondence is then deleted.",
          "At your request, the data is deleted sooner, unless keeping it is required by law.",
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
        title: "12. Changes",
        paragraphs: [
          "If the way the website works changes, this policy will change too; the version date is shown at the top of the page.",
        ],
        contactLink: "Back to contact",
      },
    ],
  },
};
