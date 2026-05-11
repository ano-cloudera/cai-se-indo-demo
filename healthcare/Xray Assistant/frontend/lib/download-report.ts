export async function downloadReport(element: HTMLElement, filename: string): Promise<void> {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: imgHeight > imgWidth ? "portrait" : "landscape",
    unit: "mm",
    format: imgHeight <= 297 ? "a4" : [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
}
