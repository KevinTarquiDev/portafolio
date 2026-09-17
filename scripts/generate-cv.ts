import { mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { buildCvDocument, getCvHref, type CvDocument } from "../src/lib/cv";
import { locales } from "../src/i18n/config";

/**
 * Genera el CV en PDF (una página, sans-serif, compatible con ATS) para
 * cada locale, a partir de buildCvDocument(locale) — es decir, siempre
 * desde resume.*.json. El PDF es un artefacto derivado: nunca se lee
 * de vuelta como fuente de datos.
 *
 * La maquetación reproduce el CV oficial: tamaños, colores y distancias
 * entre líneas base están medidos sobre él, por eso el texto se posiciona
 * por línea base absoluta en lugar de dejarlo fluir.
 */

const OUTPUT_DIR = "public/cv";
const MAX_PAGES = 1;

const PAGE_WIDTH = 612;
const TEXT_LEFT = 44.775;
const TEXT_RIGHT = PAGE_WIDTH - TEXT_LEFT;
const CONTENT_WIDTH = TEXT_RIGHT - TEXT_LEFT;
const RULE_LEFT = 43.275;
const RULE_WIDTH = 525.97;
/** Tabulación derecha de las fechas: no llegan al margen. */
const DATE_RIGHT = 516.48;
const BULLET_LEFT = 47.525;
const BULLET_TEXT_LEFT = 56.275;
const NAME_BASELINE = 53.78;
const FOOTER_BASELINE = 779.75;

const REGULAR = "Helvetica";
const BOLD = "Helvetica-Bold";
const ITALIC = "Helvetica-Oblique";

/** Ascendente de Helvetica (AFM), necesaria para situar la línea base. */
const ASCENDER = 0.718;
/** Ajustes sobre el alto de línea de pdfkit: 9.25 pt general, 9.5 pt en el perfil. */
const LINE_GAP = -0.576;
const SUMMARY_LINE_GAP = -0.326;

const SIZE = {
  name: 19.5,
  role: 11,
  contact: 8,
  section: 9.5,
  entry: 9.5,
  subentry: 9,
  body: 8.5,
  footer: 7.5,
} as const;

/** Distancias entre líneas base, medidas sobre el CV oficial. */
const GAP = {
  nameToRole: 17.75,
  roleToContact: 12.5,
  contactLine: 10.75,
  contactToAvailability: 11,
  availabilityToRule: 6.75,
  headerRuleToSection: 13.27,
  titleToRule: 5.75,
  ruleToText: 10,
  ruleToEntry: 11.27,
  contentToSection: 15,
  skillsToSection: 16.5,
  skillRow: 11.5,
  entryToSubentry: 12.25,
  subentryToBullet: 10.75,
  betweenBullets: 9.9,
  betweenEntries: 12.8,
  detailToLanguages: 11.5,
} as const;

const TEXT_COLOR = "#000000";
const MUTED_COLOR = "#5c6769";
const SECTION_RULE_COLOR = "#146963";
const HEADER_RULE_COLOR = "#c2d2d0";

const FIELD_SEPARATOR = "  |  ";
const ITEM_SEPARATOR = " · ";

interface Run {
  text: string;
  font: string;
  size: number;
  color?: string;
  link?: string;
}

/** pdfkit posiciona por el alto de línea; aquí se trabaja con líneas base. */
function topFor(baseline: number, size: number): number {
  return baseline - ASCENDER * size;
}

/**
 * Línea base final de un bloque que pudo envolver en varias líneas.
 * Debe llamarse con la fuente del bloque todavía activa: el avance por
 * línea de pdfkit depende de las métricas de esa fuente.
 */
function lastBaseline(
  doc: PDFKit.PDFDocument,
  size: number,
  lineGap = LINE_GAP,
): number {
  return doc.y - (doc.currentLineHeight(true) + lineGap) + ASCENDER * size;
}

/** Escribe un bloque que puede envolver y devuelve su línea base final. */
function writeBlock(
  doc: PDFKit.PDFDocument,
  baseline: number,
  text: string,
  options: {
    font: string;
    size: number;
    left?: number;
    width?: number;
    color?: string;
    align?: "left" | "center";
    lineGap?: number;
  },
): number {
  const left = options.left ?? TEXT_LEFT;
  const lineGap = options.lineGap ?? LINE_GAP;
  doc
    .font(options.font)
    .fontSize(options.size)
    .fillColor(options.color ?? TEXT_COLOR)
    .text(text, left, topFor(baseline, options.size), {
      width: options.width ?? TEXT_RIGHT - left,
      align: options.align ?? "left",
      lineGap,
    });
  return lastBaseline(doc, options.size, lineGap);
}

function runWidth(doc: PDFKit.PDFDocument, run: Run): number {
  return doc.font(run.font).fontSize(run.size).widthOfString(run.text);
}

/** Escribe varios tramos con distinta fuente compartiendo la línea base. */
function writeRuns(
  doc: PDFKit.PDFDocument,
  baseline: number,
  left: number,
  runs: Run[],
): void {
  let x = left;
  for (const run of runs) {
    const width = runWidth(doc, run);
    doc
      .fillColor(run.color ?? TEXT_COLOR)
      .text(run.text, x, topFor(baseline, run.size), {
        lineBreak: false,
        link: run.link,
      });
    x += width;
  }
}

function centeredRuns(
  doc: PDFKit.PDFDocument,
  baseline: number,
  runs: Run[],
): void {
  const total = runs.reduce((sum, run) => sum + runWidth(doc, run), 0);
  writeRuns(doc, baseline, (PAGE_WIDTH - total) / 2, runs);
}

function horizontalRule(
  doc: PDFKit.PDFDocument,
  top: number,
  height: number,
  color: string,
): void {
  doc.save().rect(RULE_LEFT, top, RULE_WIDTH, height).fill(color).restore();
}

/** Título de sección con su filete inferior; devuelve su línea base. */
function sectionTitle(
  doc: PDFKit.PDFDocument,
  baseline: number,
  title: string,
): number {
  writeBlock(doc, baseline, title.toUpperCase(), {
    font: BOLD,
    size: SIZE.section,
  });
  horizontalRule(doc, baseline + GAP.titleToRule - 1, 1, SECTION_RULE_COLOR);
  return baseline;
}

/** Cabecera de entrada: título a la izquierda y fechas en tabulación derecha. */
function entryHeading(
  doc: PDFKit.PDFDocument,
  baseline: number,
  left: string,
  dateRange: string,
): void {
  const dates: Run = { text: dateRange, font: BOLD, size: SIZE.entry };
  writeBlock(doc, baseline, left, { font: BOLD, size: SIZE.entry });
  writeRuns(doc, baseline, DATE_RIGHT - runWidth(doc, dates), [dates]);
}

/** Viñetas con sangría francesa; devuelve la línea base de la última. */
function bulletList(
  doc: PDFKit.PDFDocument,
  baseline: number,
  items: string[],
): number {
  let current = baseline;

  items.forEach((item, index) => {
    if (index > 0) {
      current += GAP.betweenBullets;
    }
    doc.font(REGULAR).fontSize(SIZE.body).fillColor(TEXT_COLOR);
    doc.text("•", BULLET_LEFT, topFor(current, SIZE.body), {
      lineBreak: false,
    });
    doc.text(item, BULLET_TEXT_LEFT, topFor(current, SIZE.body), {
      width: TEXT_RIGHT - BULLET_TEXT_LEFT,
    });
    current = lastBaseline(doc, SIZE.body);
  });

  return current;
}

function renderHeader(doc: PDFKit.PDFDocument, cv: CvDocument): number {
  let baseline = NAME_BASELINE;

  writeBlock(doc, baseline, cv.name.toUpperCase(), {
    font: BOLD,
    size: SIZE.name,
    align: "center",
  });

  baseline += GAP.nameToRole;
  writeBlock(doc, baseline, cv.label.toUpperCase(), {
    font: BOLD,
    size: SIZE.role,
    align: "center",
  });

  baseline += GAP.roleToContact;
  centeredRuns(doc, baseline, [
    {
      text: `${cv.contact.location}${FIELD_SEPARATOR}${cv.contact.phone}${FIELD_SEPARATOR}`,
      font: REGULAR,
      size: SIZE.contact,
    },
    {
      text: cv.contact.email,
      font: REGULAR,
      size: SIZE.contact,
      link: `mailto:${cv.contact.email}`,
    },
  ]);

  baseline += GAP.contactLine;
  centeredRuns(
    doc,
    baseline,
    cv.contact.links.map((link, index) => ({
      text: `${index === 0 ? "" : FIELD_SEPARATOR}${link.label}`,
      font: REGULAR,
      size: SIZE.contact,
      link: link.url,
    })),
  );

  baseline += GAP.contactToAvailability;
  writeBlock(doc, baseline, cv.contact.availability, {
    font: REGULAR,
    size: SIZE.contact,
    color: MUTED_COLOR,
    align: "center",
  });

  horizontalRule(
    doc,
    baseline + GAP.availabilityToRule - 0.75,
    0.75,
    HEADER_RULE_COLOR,
  );

  return baseline + GAP.availabilityToRule + GAP.headerRuleToSection;
}

function renderCv(doc: PDFKit.PDFDocument, cv: CvDocument): void {
  let baseline = renderHeader(doc, cv);

  sectionTitle(doc, baseline, cv.sections.profile);
  baseline += GAP.titleToRule + GAP.ruleToText;
  baseline = writeBlock(doc, baseline, cv.summary, {
    font: REGULAR,
    size: SIZE.body,
    lineGap: SUMMARY_LINE_GAP,
  });

  baseline += GAP.contentToSection;
  sectionTitle(doc, baseline, cv.sections.skills);
  baseline += GAP.titleToRule + GAP.ruleToText;
  cv.skills.forEach((group, index) => {
    if (index > 0) {
      baseline += GAP.skillRow;
    }
    doc
      .font(BOLD)
      .fontSize(SIZE.body)
      .fillColor(TEXT_COLOR)
      .text(`${group.name}: `, TEXT_LEFT, topFor(baseline, SIZE.body), {
        width: CONTENT_WIDTH,
        continued: true,
      });
    doc.font(REGULAR).text(group.keywords.join(ITEM_SEPARATOR));
    baseline = lastBaseline(doc, SIZE.body);
  });

  baseline += GAP.skillsToSection;
  sectionTitle(doc, baseline, cv.sections.experience);
  baseline += GAP.titleToRule + GAP.ruleToEntry;
  cv.experience.forEach((job, index) => {
    if (index > 0) {
      baseline += GAP.betweenEntries;
    }
    entryHeading(doc, baseline, job.company, job.dateRange);
    baseline += GAP.entryToSubentry;
    writeRuns(doc, baseline, TEXT_LEFT, [
      { text: job.position, font: BOLD, size: SIZE.subentry },
      { text: FIELD_SEPARATOR, font: ITALIC, size: SIZE.subentry },
      { text: job.detail, font: ITALIC, size: SIZE.body },
    ]);
    baseline = bulletList(doc, baseline + GAP.subentryToBullet, job.highlights);
  });

  baseline += GAP.contentToSection;
  sectionTitle(doc, baseline, cv.sections.projects);
  baseline += GAP.titleToRule + GAP.ruleToEntry;
  cv.projects.forEach((project, index) => {
    if (index > 0) {
      baseline += GAP.betweenEntries;
    }
    entryHeading(doc, baseline, project.name, project.dateRange);
    baseline += GAP.entryToSubentry;
    writeBlock(doc, baseline, project.description, {
      font: BOLD,
      size: SIZE.subentry,
    });
    baseline = bulletList(
      doc,
      baseline + GAP.subentryToBullet,
      project.highlights,
    );
  });

  baseline += GAP.contentToSection;
  sectionTitle(doc, baseline, cv.sections.education);
  baseline += GAP.titleToRule + GAP.ruleToEntry;
  cv.education.forEach((entry, index) => {
    if (index > 0) {
      baseline += GAP.betweenEntries;
    }
    entryHeading(doc, baseline, entry.institution, entry.dateRange);
    baseline += GAP.entryToSubentry;
    baseline = writeBlock(doc, baseline, entry.detail, {
      font: BOLD,
      size: SIZE.subentry,
    });
  });

  baseline += GAP.detailToLanguages;
  doc
    .font(BOLD)
    .fontSize(SIZE.body)
    .fillColor(TEXT_COLOR)
    .text(`${cv.languagesLabel}: `, TEXT_LEFT, topFor(baseline, SIZE.body), {
      width: CONTENT_WIDTH,
      continued: true,
    });
  doc.font(REGULAR).text(cv.languagesLine);
}

/** Pie de página en todas las páginas, por debajo del margen inferior. */
function renderFooter(doc: PDFKit.PDFDocument, cv: CvDocument): void {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    centeredRuns(doc, FOOTER_BASELINE, [
      {
        text: `${cv.name}${ITEM_SEPARATOR}${cv.label}`,
        font: REGULAR,
        size: SIZE.footer,
        color: MUTED_COLOR,
      },
    ]);
    doc.page.margins.bottom = bottomMargin;
  }
}

async function generateForLocale(
  locale: (typeof locales)[number],
): Promise<void> {
  const cv = buildCvDocument(locale);
  const outputPath = join(OUTPUT_DIR, getCvHref(locale).replace("/cv/", ""));

  const doc = new PDFDocument({
    size: "LETTER",
    margins: {
      top: 39.78,
      bottom: 30,
      left: TEXT_LEFT,
      right: TEXT_LEFT,
    },
    bufferPages: true,
    lang: locale,
    info: {
      Title: `${cv.name} — ${cv.label}`,
      Author: cv.name,
      Subject: cv.label,
      Keywords: cv.skills.flatMap((group) => group.keywords).join(", "),
    },
  });
  doc.lineGap(LINE_GAP);

  let pageCount = 1;
  doc.on("pageAdded", () => {
    pageCount++;
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });

  renderCv(doc, cv);
  renderFooter(doc, cv);
  doc.end();
  await finished;

  if (pageCount > MAX_PAGES) {
    throw new Error(
      `El CV en ${locale} ocupa ${pageCount} páginas (máximo ${MAX_PAGES}). Recorta el contenido del resume.`,
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  await Bun.write(outputPath, new Uint8Array(Buffer.concat(chunks)));
  console.log(
    `✅ ${outputPath} (${pageCount} página${pageCount > 1 ? "s" : ""})`,
  );
}

async function main(): Promise<void> {
  for (const locale of locales) {
    await generateForLocale(locale);
  }
}

main().catch((error: unknown) => {
  console.error("❌ No se pudo generar el CV:", error);
  process.exit(1);
});
