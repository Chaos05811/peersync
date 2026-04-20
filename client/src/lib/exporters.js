import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";

function sanitizeFileName(value) {
  return value.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "document";
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getEditorPlainText(editor) {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n\n");
}

function getParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function downloadTxt({ editor, title, fallbackName }) {
  const fileName = sanitizeFileName(title || fallbackName);
  const text = getEditorPlainText(editor);
  triggerDownload(
    `${fileName}.txt`,
    new Blob([text], { type: "text/plain;charset=utf-8" })
  );
}

export async function downloadDocx({ editor, title, fallbackName }) {
  const fileName = sanitizeFileName(title || fallbackName);
  const text = getEditorPlainText(editor);
  const paragraphs = getParagraphs(text);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(title || fallbackName || "Untitled Document")]
          }),
          ...(
            paragraphs.length > 0
              ? paragraphs.map(
                  (paragraph) =>
                    new Paragraph({
                      children: [new TextRun(paragraph)]
                    })
                )
              : [new Paragraph({ children: [new TextRun("")] })]
          )
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(`${fileName}.docx`, blob);
}

export function downloadPdf({ editor, title, fallbackName }) {
  const fileName = sanitizeFileName(title || fallbackName);
  const text = getEditorPlainText(editor) || "";
  const pdf = new jsPDF({
    unit: "pt",
    format: "a4"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 56;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const heading = title || fallbackName || "Untitled Document";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(heading, margin, margin);

  pdf.setFont("times", "normal");
  pdf.setFontSize(12);

  const lines = pdf.splitTextToSize(text || " ", usableWidth);
  const lineHeight = 18;
  let cursorY = margin + 32;

  lines.forEach((line) => {
    if (cursorY + lineHeight > margin + usableHeight) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.text(line, margin, cursorY);
    cursorY += lineHeight;
  });

  pdf.save(`${fileName}.pdf`);
}
