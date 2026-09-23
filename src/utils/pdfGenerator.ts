import { jsPDF } from 'jspdf';
import { Member, CommitteeSettings } from '../types';

export const generateMemberIdCardPdf = async (
  member: Member,
  settings: CommitteeSettings,
  qrCodeDataUrl?: string
): Promise<void> => {
  // Standard CR-80 ID Card dimensions: 85.6mm x 54mm (Landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54],
  });

  const cardWidth = 85.6;
  const cardHeight = 54;

  // Background gradient-like header (Primary Blue: #1e40af = [30, 64, 175])
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, cardWidth, 13, 'F');

  // Green accent bar (#16a34a = [22, 163, 74])
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 13, cardWidth, 1.2, 'F');

  // Background body (#f8fafc = [248, 250, 252])
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 14.2, cardWidth, cardHeight - 14.2, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    (settings.committeeName || 'KISHAU BANDH SANGHARSH SAMITI').toUpperCase(),
    cardWidth / 2,
    5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('GRAM MAILOTH SHAMBHAR KWANU', cardWidth / 2, 8.5, { align: 'center' });

  doc.setFontSize(4.5);
  doc.text('MEMBERSHIP IDENTITY CARD', cardWidth / 2, 11.5, { align: 'center' });

  // Photo Section (Left side: 4mm, 17mm)
  const photoX = 4;
  const photoY = 17;
  const photoW = 20;
  const photoH = 24;

  // Draw Photo Frame
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH);

  if (member.photoUrl && member.photoUrl.startsWith('data:image')) {
    try {
      doc.addImage(member.photoUrl, 'JPEG', photoX, photoY, photoW, photoH);
    } catch {
      // Fallback gray box
      doc.setFillColor(226, 232, 240);
      doc.rect(photoX, photoY, photoW, photoH, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFillColor(226, 232, 240);
    doc.rect(photoX, photoY, photoW, photoH, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text('MEMBER', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // User Code Badge beneath photo
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(photoX, 42, photoW, 5.5, 0.8, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(member.userCode || 'KBS-00000', photoX + photoW / 2, 45.8, { align: 'center' });

  // Middle Details Section
  const detailsX = 27;
  let currentY = 19;

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const displayName = member.name.length > 22 ? member.name.substring(0, 22) + '...' : member.name;
  doc.text(displayName, detailsX, currentY);

  // Designation Badge
  currentY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(member.designationName || 'Executive Member', detailsX, currentY);

  // Field: Father/Husband
  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("FATHER/HUSBAND:", detailsX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(member.fatherName || 'N/A', detailsX + 18, currentY);

  // Field: Education
  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("EDUCATION:", detailsX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(member.educationName || 'N/A', detailsX + 18, currentY);

  // Field: Village
  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("VILLAGE:", detailsX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(member.village || 'Gram Meloth', detailsX + 18, currentY);

  // Field: Issued Date
  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("ISSUED ON:", detailsX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const issueDateStr = member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(issueDateStr, detailsX + 18, currentY);

  // Right Side: QR Code + Signature
  const rightX = 66;
  const qrSize = 15;
  const qrY = 17.5;

  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', rightX, qrY, qrSize, qrSize);
    } catch {
      doc.setDrawColor(203, 213, 225);
      doc.rect(rightX, qrY, qrSize, qrSize);
    }
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.rect(rightX, qrY, qrSize, qrSize);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.setTextColor(100, 116, 139);
  doc.text("SCAN TO VERIFY", rightX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });

  // Signature line
  const sigY = 43;
  if (settings.signatureUrl && settings.signatureUrl.startsWith('data:image')) {
    try {
      doc.addImage(settings.signatureUrl, 'PNG', rightX - 2, sigY - 5, 18, 5);
    } catch {
      // ignore
    }
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.line(rightX - 3, sigY, rightX + 16, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(71, 85, 105);
  doc.text("AUTHORISED SIGNATORY", rightX + 6.5, sigY + 2.5, { align: 'center' });

  // Bottom Security Line
  doc.setFillColor(30, 64, 175);
  doc.rect(0, cardHeight - 3, cardWidth, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.text(
    "OFFICIAL MEMBER CARD • GRAM SABHA RIGHTS • KISHAU DAM RECONSIDERATION",
    cardWidth / 2,
    cardHeight - 1,
    { align: 'center' }
  );

  // Save the PDF
  const filename = `${member.userCode || 'Member'}_ID_Card.pdf`;
  doc.save(filename);
};
