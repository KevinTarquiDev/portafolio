import { mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { buildCvDocument, getCvHref, type CvDocument } from "../src/lib/cv";
import { locales } from "../src/i18n/config";

/**
 * Genera el CV en PDF (estilo Harvard, compatible con ATS) para cada
 * locale, a partir de buildCvDocument(locale) — es decir, siempre
 * desde resume.*.json. El PDF es un artefacto derivado: nunca se lee
 * de vuelta como fuente de datos.
 */

const OUTPUT_DIR = "public/cv";
const MAX_PAGES = 2;

const MARGIN = 54;
const BODY_SIZE = 10.5;
const SECTION_TITLE_SIZE = 11;
const NAME_SIZE = 20;

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/** Escribe una línea con un texto a la izquierda y otro alineado a la derecha. */
function twoColumnLine(
  doc: PDFKit.PDFDocument,
  left: string,
  right: string,
  options: { leftFont: string; rightFont?: string; size?: number },
): void {
  const width = contentWidth(doc);
  const size = options.size ?? BODY_SIZE;
  const y = doc.y;

  doc.font(options.leftFont).fontSize(size);
  doc.text(left, doc.page.margins.left, y, { width: width * 0.68 });
  const leftBottom = doc.y;

  doc.font(options.rightFont ?? "Times-Roman").fontSize(size);
  doc.text(right, doc.page.margins.left, y, { width, align: "right" });

  doc.y = Math.max(leftBottom, doc.y);
}

/**
 * Escribe una línea centrada compuesta de varios segmentos, algunos
 * con su propio link (anotación). pdfkit no centra bien un `align:
 * "center"` repartido entre llamadas `continued: true`, así que aquí
 * se mide el ancho total y se posiciona manualmente.
 */
function centeredMixedLine(
  doc: PDFKit.PDFDocument,
  segments: Array<{ text: string; link?: string }>,
): void {
  const totalWidth = segments.reduce(
    (sum, segment) => sum + doc.widthOfString(segment.text),
    0,
  );
  const startX = doc.page.margins.left + (contentWidth(doc) - totalWidth) / 2;
  doc.x = startX;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    doc.text(segment.text, {
      continued: !isLast,
      link: segment.link,
      underline: Boolean(segment.link),
    });
  });

  // Un `continued` deja `doc.x` donde terminó el texto: se restablece
  // al margen izquierdo para que el contenido siguiente no herede la
  // posición centrada de esta línea.
  doc.x = doc.page.margins.left;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.6);
  doc
    .font("Times-Bold")
    .fontSize(SECTION_TITLE_SIZE)
    .text(title.toUpperCase(), { characterSpacing: 0.5 });
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.5)
    .strokeColor("#000000")
    .stroke();
  doc.moveDown(0.5);
}

function bulletList(doc: PDFKit.PDFDocument, items: string[]): void {
  const width = contentWidth(doc);
  doc.font("Times-Roman").fontSize(BODY_SIZE);
  for (const item of items) {
    doc.text(`• ${item}`, doc.page.margins.left + 10, doc.y, {
      width: width - 10,
    });
  }
}

function renderCv(doc: PDFKit.PDFDocument, cv: CvDocument): void {
  const width = contentWidth(doc);

  doc.font("Times-Bold").fontSize(NAME_SIZE).text(cv.name, { align: "center" });
  doc
    .font("Times-Roman")
    .fontSize(BODY_SIZE + 1)
    .text(cv.label, {
      align: "center",
    });
  doc.moveDown(0.4);

  doc.font("Times-Roman").fontSize(BODY_SIZE);
  centeredMixedLine(doc, [
    { text: `${cv.contact.location}   ·   ${cv.contact.phone}   ·   ` },
    { text: cv.contact.email, link: `mailto:${cv.contact.email}` },
  ]);
  if (cv.contact.profiles.length > 0) {
    centeredMixedLine(
      doc,
      cv.contact.profiles.map((profile, index) => ({
        text: `${index === 0 ? "" : "   ·   "}${displayUrl(profile.url)}`,
        link: profile.url,
      })),
    );
  }

  doc.moveDown(0.8);

  sectionTitle(doc, cv.sections.profile);
  doc.font("Times-Roman").fontSize(BODY_SIZE).text(cv.summary, { width });

  sectionTitle(doc, cv.sections.experience);
  cv.experience.forEach((job, index) => {
    if (index > 0) {
      doc.moveDown(0.5);
    }
    twoColumnLine(doc, job.company, job.location, { leftFont: "Times-Bold" });
    twoColumnLine(doc, job.position, job.dateRange, {
      leftFont: "Times-Italic",
      rightFont: "Times-Roman",
    });
    doc.moveDown(0.15);
    bulletList(doc, job.highlights);
  });

  if (cv.projects.length > 0) {
    sectionTitle(doc, cv.sections.projects);
    cv.projects.forEach((project, index) => {
      if (index > 0) {
        doc.moveDown(0.5);
      }
      twoColumnLine(doc, project.name, project.dateRange, {
        leftFont: "Times-Bold",
      });
      const meta = [
        project.type,
        displayUrl(project.url),
        project.keywords.join(", "),
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.font("Times-Italic").fontSize(BODY_SIZE).text(meta, { width });
      doc.moveDown(0.15);
      bulletList(doc, project.highlights);
    });
  }

  sectionTitle(doc, cv.sections.education);
  cv.education.forEach((entry, index) => {
    if (index > 0) {
      doc.moveDown(0.5);
    }
    twoColumnLine(doc, entry.area, entry.dateRange, { leftFont: "Times-Bold" });
    const line = entry.status
      ? `${entry.institution} — ${entry.studyType} (${entry.status})`
      : `${entry.institution} — ${entry.studyType}`;
    doc.font("Times-Italic").fontSize(BODY_SIZE).text(line, { width });
  });

  sectionTitle(doc, cv.sections.skills);
  for (const group of cv.skills) {
    doc.font("Times-Bold").fontSize(BODY_SIZE).text(`${group.name}: `, {
      continued: true,
      width,
    });
    doc.font("Times-Roman").text(group.keywords.join(", "));
  }

  sectionTitle(doc, cv.sections.languages);
  const languagesLine = cv.languages
    .map((entry) => `${entry.language} — ${entry.fluency}`)
    .join("   ·   ");
  doc.font("Times-Roman").fontSize(BODY_SIZE).text(languagesLine, { width });
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function generateForLocale(
  locale: (typeof locales)[number],
): Promise<void> {
  const cv = buildCvDocument(locale);
  const outputPath = join(OUTPUT_DIR, getCvHref(locale).replace("/cv/", ""));

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    lang: locale,
    info: {
      Title: `${cv.name} — ${cv.label}`,
      Author: cv.name,
      Subject: cv.label,
      Keywords: cv.skills.flatMap((group) => group.keywords).join(", "),
    },
  });

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
