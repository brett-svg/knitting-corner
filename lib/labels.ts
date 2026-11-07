import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type YarnForLabel = {
  brand: string;
  productLine: string;
  colorway: string;
  weight: string;
  skeins: number;
};

export type BoxLabel = {
  name: string;
  yarns: YarnForLabel[];
};

function inventoryFontPt(itemCount: number, availableHeight: number): number {
  if (itemCount === 0) return 9;
  const lineHeight = availableHeight / itemCount;
  const fontSize = lineHeight / 1.45;
  return Math.min(9, Math.max(5, fontSize));
}

export async function generateLabelsPdf(boxes: BoxLabel[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const W = 6 * 72; // 432pt
  const H = 4 * 72; // 288pt

  for (const box of boxes) {
    const page = pdf.addPage([W, H]);
    const pad = 10;
    const headerH = Math.round(H * 0.35);
    const headerY = H - headerH;

    // Dark header band
    page.drawRectangle({
      x: 0,
      y: headerY,
      width: W,
      height: headerH,
      color: rgb(0.059, 0.09, 0.165),
    });

    // Box name — large white text
    const nameFontSize = Math.min(42, Math.round(headerH * 0.5));
    page.drawText(box.name, {
      x: pad + 2,
      y: headerY + headerH - pad - nameFontSize,
      size: nameFontSize,
      font: bold,
      color: rgb(1, 1, 1),
    });

    // Yarn count subtitle
    const count = box.yarns.length;
    const subtitle = count === 1 ? "1 yarn" : `${count} yarns`;
    const subFontSize = Math.round(nameFontSize * 0.3);
    page.drawText(subtitle, {
      x: pad + 2,
      y: headerY + pad,
      size: subFontSize,
      font: regular,
      color: rgb(0.58, 0.64, 0.73),
    });

    // Contents zone
    const items = box.yarns;
    const itemCount = items.length;
    const contentsY = headerY - pad;
    const labelFontSize = 7;
    const itemTopGap = 8;
    const itemStartY = contentsY - labelFontSize - itemTopGap;
    const availHeight = itemStartY - pad;

    page.drawText(
      `CONTENTS${itemCount > 0 ? `  ·  ${itemCount}` : ""}`,
      {
        x: pad,
        y: contentsY - labelFontSize,
        size: labelFontSize,
        font: bold,
        color: rgb(0.39, 0.46, 0.55),
      }
    );

    if (itemCount === 0) {
      page.drawText("No yarns assigned", {
        x: pad + 8,
        y: itemStartY,
        size: 9,
        font: regular,
        color: rgb(0.58, 0.64, 0.73),
      });
      continue;
    }

    const singleColFont = inventoryFontPt(itemCount, availHeight);
    const useTwo = itemCount > 8 || (singleColFont < 7 && itemCount > 4);
    const cols = useTwo ? 2 : 1;
    const itemsPerCol = Math.ceil(itemCount / cols);
    const colFont = Math.min(9, inventoryFontPt(itemsPerCol, availHeight));
    const lineH = colFont * 1.45;
    const colWidth = (W - pad * 2) / cols;
    const bulletR = Math.max(0.8, colFont * 0.1);
    const indent = bulletR * 3 + 3;

    const maxTextW = colWidth - indent - 4;

    items.forEach((yarn, i) => {
      const col = Math.floor(i / itemsPerCol);
      const row = i % itemsPerCol;
      const x = pad + col * colWidth;
      const y = itemStartY - row * lineH;

      page.drawCircle({
        x: x + bulletR + 1,
        y: y + colFont * 0.3,
        size: bulletR,
        color: rgb(0.06, 0.09, 0.15),
      });

      const parts = [yarn.brand, yarn.colorway].filter(Boolean);
      let text = parts.join(" — ");
      if (yarn.weight) text += ` (${yarn.weight})`;
      if (yarn.skeins > 1) text += ` x${yarn.skeins}`;

      while (text.length > 1 && regular.widthOfTextAtSize(text, colFont) > maxTextW) {
        text = text.slice(0, -1);
      }
      if (regular.widthOfTextAtSize(text, colFont) > maxTextW) {
        text = text.slice(0, -1) + "…";
      }

      page.drawText(text, {
        x: x + indent,
        y,
        size: colFont,
        font: regular,
        color: rgb(0.06, 0.09, 0.15),
      });
    });
  }

  return Buffer.from(await pdf.save());
}
