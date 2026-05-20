import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

type PdfColor = [number, number, number];

export type ProfilePdfSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
  }>;
};

export type ProfilePdfDocument = {
  profileName: string;
  ageLabel: string;
  subtitle: string;
  location: string;
  education?: string | null;
  phone?: string | null;
  quickFacts: string[];
  profileUrl: string;
  downloadedAt: string;
  photoUrl?: string | null;
  sections: ProfilePdfSection[];
};

type PreparedImage = {
  data: Buffer;
  width: number;
  height: number;
};

type PdfPage = {
  commands: string[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const BOTTOM_MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  rose: [0.93, 0.16, 0.36] as PdfColor,
  slate: [0.07, 0.11, 0.19] as PdfColor,
  gray: [0.34, 0.39, 0.5] as PdfColor,
  lightGray: [0.88, 0.9, 0.94] as PdfColor,
  panel: [0.99, 0.97, 0.98] as PdfColor,
};

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/₹/g, "INR")
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function wrapText(text: string, maxWidth: number, fontSize: number, bold = false) {
  const normalized = normalizePdfText(text);
  if (!normalized) {
    return [];
  }

  const charWidth = fontSize * (bold ? 0.56 : 0.52);
  const maxChars = Math.max(10, Math.floor(maxWidth / charWidth));
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  const pushChunkedWord = (word: string) => {
    if (word.length <= maxChars) {
      lines.push(word);
      return;
    }

    for (let index = 0; index < word.length; index += maxChars) {
      lines.push(word.slice(index, index + maxChars));
    }
  };

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ").filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      if (!currentLine) {
        if (word.length > maxChars) {
          pushChunkedWord(word);
        } else {
          currentLine = word;
        }
        continue;
      }

      const candidate = `${currentLine} ${word}`;
      if (candidate.length <= maxChars) {
        currentLine = candidate;
        continue;
      }

      lines.push(currentLine);
      if (word.length > maxChars) {
        pushChunkedWord(word);
        currentLine = "";
      } else {
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function fillRect(page: PdfPage, x: number, y: number, width: number, height: number, color: PdfColor) {
  page.commands.push(
    `${color.join(" ")} rg ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f`
  );
}

function strokeRect(page: PdfPage, x: number, y: number, width: number, height: number, color: PdfColor) {
  page.commands.push(
    `${color.join(" ")} RG ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S`
  );
}

function drawLine(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color: PdfColor) {
  page.commands.push(
    `${color.join(" ")} RG 1 w ${formatNumber(x1)} ${formatNumber(y1)} m ${formatNumber(x2)} ${formatNumber(y2)} l S`
  );
}

function drawText(
  page: PdfPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: PdfColor
) {
  if (!text) {
    return;
  }

  page.commands.push(
    `BT /${font} ${formatNumber(size)} Tf ${color.join(" ")} rg 1 0 0 1 ${formatNumber(x)} ${formatNumber(
      y
    )} Tm (${escapePdfText(normalizePdfText(text))}) Tj ET`
  );
}

async function loadImageBuffer(photoUrl: string) {
  if (!photoUrl) {
    return null;
  }

  if (photoUrl.startsWith("data:image/")) {
    const [, encoded = ""] = photoUrl.split(",", 2);
    return Buffer.from(encoded, "base64");
  }

  if (photoUrl.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", photoUrl.replace(/^\/+/, ""));
    return readFile(filePath);
  }

  const response = await fetch(photoUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function prepareProfileImage(photoUrl?: string | null): Promise<PreparedImage | null> {
  if (!photoUrl) {
    return null;
  }

  try {
    const imageBuffer = await loadImageBuffer(photoUrl);
    if (!imageBuffer) {
      return null;
    }

    const { data, info } = await sharp(imageBuffer)
      .rotate()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}

function buildPdfObject(body: Buffer | string, objectId: number) {
  const bufferBody = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  return Buffer.concat([
    Buffer.from(`${objectId} 0 obj\n`, "utf8"),
    bufferBody,
    Buffer.from("\nendobj\n", "utf8"),
  ]);
}

export async function buildProfilePdf(document: ProfilePdfDocument) {
  const pages: PdfPage[] = [{ commands: [] }];
  const firstPage = pages[0];

  const addPageChrome = (page: PdfPage) => {
    drawText(page, "Vivah Bandhan", MARGIN_X, PAGE_HEIGHT - 36, 12, "F2", COLORS.rose);
    drawText(page, "Profile details", PAGE_WIDTH - 145, PAGE_HEIGHT - 36, 10, "F1", COLORS.gray);
    drawLine(page, MARGIN_X, PAGE_HEIGHT - 48, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 48, COLORS.lightGray);
  };

  addPageChrome(firstPage);

  const preparedImage = await prepareProfileImage(document.photoUrl);
  const photoBox = {
    x: MARGIN_X,
    y: 548,
    width: 165,
    height: 210,
  };

  fillRect(firstPage, photoBox.x, photoBox.y, photoBox.width, photoBox.height, COLORS.panel);
  strokeRect(firstPage, photoBox.x, photoBox.y, photoBox.width, photoBox.height, COLORS.lightGray);

  if (preparedImage) {
    const imageScale = Math.min(
      photoBox.width / preparedImage.width,
      photoBox.height / preparedImage.height
    );
    const imageWidth = preparedImage.width * imageScale;
    const imageHeight = preparedImage.height * imageScale;
    const imageX = photoBox.x + (photoBox.width - imageWidth) / 2;
    const imageY = photoBox.y + (photoBox.height - imageHeight) / 2;

    firstPage.commands.push(
      `q ${formatNumber(imageWidth)} 0 0 ${formatNumber(imageHeight)} ${formatNumber(imageX)} ${formatNumber(
        imageY
      )} cm /Im1 Do Q`
    );
  } else {
    drawText(
      firstPage,
      "No profile photo uploaded",
      photoBox.x + 22,
      photoBox.y + photoBox.height / 2,
      11,
      "F1",
      COLORS.gray
    );
  }

  const summaryX = photoBox.x + photoBox.width + 28;
  drawText(firstPage, `${document.profileName}, ${document.ageLabel}`, summaryX, 736, 26, "F2", COLORS.slate);
  drawText(firstPage, document.subtitle || "Matrimony Member", summaryX, 704, 17, "F1", COLORS.gray);

  const summaryRows = [
    ["Location", document.location],
    ["Education", document.education || "Not added"],
    ["Quick Facts", document.quickFacts.join(" | ") || "Not added"],
    ["Phone", document.phone || "Not added"],
    ["Profile Link", document.profileUrl],
    ["Downloaded On", document.downloadedAt],
  ];

  let summaryY = 660;
  for (const [label, value] of summaryRows) {
    drawText(firstPage, label, summaryX, summaryY, 10.5, "F2", COLORS.rose);
    const lines = wrapText(value, PAGE_WIDTH - summaryX - MARGIN_X, 12);
    let lineY = summaryY - 18;
    for (const line of lines) {
      drawText(firstPage, line, summaryX, lineY, 12, "F1", COLORS.slate);
      lineY -= 15;
    }
    summaryY = lineY - 10;
  }

  let currentPage = firstPage;
  let cursorY = 508;

  const createNewPage = () => {
    const page: PdfPage = { commands: [] };
    addPageChrome(page);
    pages.push(page);
    currentPage = page;
    cursorY = PAGE_HEIGHT - 84;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < BOTTOM_MARGIN) {
      createNewPage();
    }
  };

  for (const section of document.sections) {
    const visibleRows = section.rows.filter((row) => row.value.trim().length > 0);
    if (visibleRows.length === 0) {
      continue;
    }

    ensureSpace(34);
    drawText(currentPage, section.title, MARGIN_X, cursorY, 16, "F2", COLORS.rose);
    cursorY -= 12;
    drawLine(currentPage, MARGIN_X, cursorY, PAGE_WIDTH - MARGIN_X, cursorY, COLORS.lightGray);
    cursorY -= 18;

    for (const row of visibleRows) {
      const rowText = `${row.label}: ${row.value}`;
      const lines = wrapText(rowText, CONTENT_WIDTH, 11.5);
      const rowHeight = Math.max(1, lines.length) * 15 + 6;
      ensureSpace(rowHeight);

      for (const line of lines) {
        drawText(currentPage, line, MARGIN_X, cursorY, 11.5, "F1", COLORS.slate);
        cursorY -= 15;
      }

      cursorY -= 6;
    }

    cursorY -= 8;
  }

  pages.forEach((page, index) => {
    drawLine(page, MARGIN_X, 34, PAGE_WIDTH - MARGIN_X, 34, COLORS.lightGray);
    drawText(page, "Generated from Vivah Bandhan", MARGIN_X, 18, 9.5, "F1", COLORS.gray);
    drawText(page, `Page ${index + 1} of ${pages.length}`, PAGE_WIDTH - 110, 18, 9.5, "F1", COLORS.gray);
  });

  const imageObjectId = preparedImage ? 5 : null;
  let nextObjectId = imageObjectId ? 6 : 5;
  const pageRefs = pages.map(() => {
    const pageId = nextObjectId++;
    const contentId = nextObjectId++;
    return { pageId, contentId };
  });

  const totalObjects = nextObjectId - 1;
  const rawObjects: Buffer[] = new Array(totalObjects);

  rawObjects[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8");
  rawObjects[1] = Buffer.from(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((page) => `${page.pageId} 0 R`).join(" ")}] >>`,
    "utf8"
  );
  rawObjects[2] = Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "utf8");
  rawObjects[3] = Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "utf8");

  if (preparedImage && imageObjectId) {
    rawObjects[imageObjectId - 1] = Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${preparedImage.width} /Height ${preparedImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${preparedImage.data.length} >>\nstream\n`,
        "utf8"
      ),
      preparedImage.data,
      Buffer.from("\nendstream", "utf8"),
    ]);
  }

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const { pageId, contentId } = pageRefs[index];
    const contentStream = Buffer.from(page.commands.join("\n"), "utf8");
    const resources = `<< /Font << /F1 3 0 R /F2 4 0 R >>${
      preparedImage && imageObjectId ? ` /XObject << /Im1 ${imageObjectId} 0 R >>` : ""
    } >>`;

    rawObjects[pageId - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>`,
      "utf8"
    );

    rawObjects[contentId - 1] = Buffer.concat([
      Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, "utf8"),
      contentStream,
      Buffer.from("\nendstream", "utf8"),
    ]);
  }

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets: number[] = [0];
  let currentOffset = parts[0].length;

  for (let index = 0; index < rawObjects.length; index += 1) {
    const objectBuffer = buildPdfObject(rawObjects[index], index + 1);
    offsets.push(currentOffset);
    parts.push(objectBuffer);
    currentOffset += objectBuffer.length;
  }

  const xrefOffset = currentOffset;
  const xrefEntries = offsets
    .map((offset, index) =>
      index === 0
        ? "0000000000 65535 f "
        : `${String(offset).padStart(10, "0")} 00000 n `
    )
    .join("\n");

  parts.push(
    Buffer.from(
      `xref\n0 ${offsets.length}\n${xrefEntries}\ntrailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
      "utf8"
    )
  );

  return Buffer.concat(parts);
}
