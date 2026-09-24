import React, { useRef, useState } from 'react';
import { MemberRecord, CommitteeSettings } from '../types';
import { formatCardCode, formatDesignationDisplay } from '../services/db';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  ShieldCheck,
  FileText,
  Printer,
  Calendar,
  Phone,
  MapPin,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Award
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

interface IdCardViewProps {
  member: MemberRecord;
  settings: CommitteeSettings;
  onClose?: () => void;
}

export const IdCardView: React.FC<IdCardViewProps> = ({ member, settings, onClose }) => {
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Strictly ensure all member codes display with KBSS- prefix (e.g. KBSS-ADM-001, KBSS-PRES-001, KBSS-MEM-00001)
  const displayCode = formatCardCode(member.code, member.designation, member.role);

  const isAdmin =
    member.role === 'ADMIN' ||
    member.code === 'ADM-001' ||
    member.code === '0.00' ||
    member.code === '0.0' ||
    member.code === 'KBSS-ADM-001' ||
    displayCode === 'KBSS-ADM-001' ||
    displayCode.includes('ADM') ||
    (member.designation && member.designation.toLowerCase().includes('admin')) ||
    (member.designation && member.designation.toLowerCase().includes('administrator')) ||
    (member.email && member.email.toLowerCase().includes('kishaubandhsangharshsamiti@gmail.com')) ||
    (member.name && member.name.toLowerCase().includes('narendra'));

  const isPresident =
    !isAdmin &&
    (member.role === 'PRESIDENT' ||
      displayCode === '0.001' ||
      displayCode.includes('0.001') ||
      displayCode.includes('PRES') ||
      member.code === '0.001' ||
      (member.designation && member.designation.toLowerCase().includes('president')) ||
      (member.designation && member.designation.includes('अध्यक्ष')) ||
      (member.name && member.name.toLowerCase().includes('surat singh')) ||
      (member.name && member.name.toLowerCase().includes('surat')));

  const isOfficer =
    !isPresident &&
    !isAdmin &&
    (member.role === 'OFFICE_BEARER' ||
      displayCode.includes('OFF') ||
      displayCode.includes('VP') ||
      displayCode.includes('SEC') ||
      member.code.startsWith('0.') ||
      (member.code.length === 3 && /^\d{3}$/.test(member.code)));

  // Resolve official Adhyaksh (President) & Admin names for all user ID cards
  const presidentDisplayName =
    (settings.presidentName &&
      settings.presidentName.trim() &&
      settings.presidentName.trim().toLowerCase() !== 'president' &&
      settings.presidentName.trim()) ||
    'Surat Singh Tomar';

  const adminDisplayName =
    (settings.adminName &&
      settings.adminName.trim() &&
      settings.adminName.trim().toLowerCase() !== 'administrator' &&
      settings.adminName.trim().toLowerCase() !== 'admin' &&
      settings.adminName.trim().toLowerCase() !== 'executive committee administrator' &&
      settings.adminName.trim()) ||
    'Narendra Singh Tomar';

  // Helper to ensure all images in element are loaded before html2canvas captures
  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 1000); // 1s safety timeout
        });
      })
    );
  };

  // Safe capture helper
  const captureCard = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    await waitForImages(element);
    return await html2canvas(element, {
      scale: 3, // Ultra-sharp 300+ DPI
      useCORS: true,
      allowTaint: false, // CRITICAL: must be false so toDataURL() does not throw security error
      backgroundColor: '#ffffff',
      logging: false
    });
  };

  // 1. Download Front PNG
  const downloadFrontPng = async () => {
    if (!cardFrontRef.current) return;
    setDownloading(true);
    const toastId = toast.loading('Generating HD Front Card image...');
    try {
      const canvas = await captureCard(cardFrontRef.current);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ID_FRONT_${displayCode}_${member.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success('Front Side downloaded in High Resolution!');
    } catch (err: any) {
      console.error('PNG Front Download error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download image: ' + (err?.message || 'Please retry'));
    } finally {
      setDownloading(false);
    }
  };

  // 2. Download Back PNG
  const downloadBackPng = async () => {
    if (!cardBackRef.current) return;
    setDownloading(true);
    const toastId = toast.loading('Generating HD Back Card image...');
    try {
      const canvas = await captureCard(cardBackRef.current);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ID_BACK_${displayCode}_${member.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success('Reverse Side downloaded in High Resolution!');
    } catch (err: any) {
      console.error('PNG Back Download error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download image: ' + (err?.message || 'Please retry'));
    } finally {
      setDownloading(false);
    }
  };

  // 3. Download Combined (Both Front & Back in 1 image, Aadhaar / CR80 Size)
  const downloadCombinedPng = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;
    setDownloading(true);
    const toastId = toast.loading('Generating Aadhaar-size ID Card (Front + Back)...');
    try {
      const canvasFront = await captureCard(cardFrontRef.current);
      const canvasBack = await captureCard(cardBackRef.current);

      const padding = 30;
      const headerHeight = 40;
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = canvasFront.width + canvasBack.width + padding * 3;
      combinedCanvas.height = Math.max(canvasFront.height, canvasBack.height) + padding * 2 + headerHeight;

      const ctx = combinedCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        // Header Title
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#064e3b';
        ctx.fillText(
          `${settings.committeeName || 'Kishau Bandh Sangharsh Samiti'} • Standard Aadhaar / CR80 Card (85.6 mm × 54.0 mm)`,
          padding,
          32
        );

        // Draw Front
        const yOffset = padding + headerHeight;
        ctx.drawImage(canvasFront, padding, yOffset);

        // Draw Back
        const backX = canvasFront.width + padding * 2;
        ctx.drawImage(canvasBack, backX, yOffset);

        // Center Fold Guide Line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        const foldX = canvasFront.width + padding * 1.5;
        ctx.moveTo(foldX, yOffset - 10);
        ctx.lineTo(foldX, yOffset + Math.max(canvasFront.height, canvasBack.height) + 10);
        ctx.stroke();

        const dataUrl = combinedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `AADHAAR_SIZE_ID_CARD_${displayCode}_${member.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.dismiss(toastId);
        toast.success('Complete Aadhaar-size ID Card downloaded!');
      }
    } catch (err: any) {
      console.error('Combined Download error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download combined image: ' + (err?.message || 'Please retry'));
    } finally {
      setDownloading(false);
    }
  };

  // 4. Download PDF (Standard Aadhaar Card 85.6 mm x 54.0 mm)
  const downloadPdf = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;
    setDownloading(true);
    const toastId = toast.loading('Preparing Aadhaar-size printable PDF...');
    try {
      const canvasFront = await captureCard(cardFrontRef.current);
      const canvasBack = await captureCard(cardBackRef.current);

      const imgFront = canvasFront.toDataURL('image/jpeg', 0.98);
      const imgBack = canvasBack.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Standard ISO CR80 (Aadhaar / PVC Card) dimensions: 85.6 mm x 54.0 mm
      const cardWidth = 85.6;
      const cardHeight = 54.0;

      // Header on A4 Page
      pdf.setFontSize(15);
      pdf.setTextColor(15, 60, 40);
      pdf.text(settings.committeeName || 'Kishau Bandh Sangharsh Samiti', 105, 22, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Official Identity Card • Standard Aadhaar / PVC Card Size (85.60 mm × 54.00 mm)', 105, 28, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Front and Back aligned side-by-side • Ready to print, cut, and laminate', 105, 34, { align: 'center' });

      // Card Placement: Front and Back side-by-side
      const xFront1 = 19.4;
      const y1 = 42;
      pdf.addImage(imgFront, 'JPEG', xFront1, y1, cardWidth, cardHeight);

      const xBack1 = 105.0;
      pdf.addImage(imgBack, 'JPEG', xBack1, y1, cardWidth, cardHeight);

      // Center Dotted Fold Line
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(105.0, y1 - 3, 105.0, y1 + cardHeight + 3);

      // Outer guideline border around both sides
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.rect(xFront1, y1, cardWidth * 2, cardHeight);

      // Guideline label below card
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('[ Center Fold Line • Fold here for standard pouch lamination or cut separately ]', 105.0, y1 + cardHeight + 7, { align: 'center' });

      // ================= PRINT INSTRUCTIONS BOX =================
      const yBox = y1 + cardHeight + 18;
      pdf.setLineDashPattern([], 0);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(19.4, yBox, 171.2, 44, 2, 2, 'FD');

      pdf.setFontSize(9);
      pdf.setTextColor(15, 60, 40);
      pdf.text('Print & Card Preparation Instructions:', 24, yBox + 9);

      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text('1. Print Scale: Print at 100% scale (Select "Actual Size" - Do NOT use "Fit to Page").', 24, yBox + 17);
      pdf.text('2. Exact Dimensions: 85.60 mm x 54.00 mm (Standard Aadhaar Card / ISO CR80 PVC Size).', 24, yBox + 23);
      pdf.text('3. Printing Paper: A4 Glossy Photo Paper (220-300 GSM) or PVC Card Lamination Sheets.', 24, yBox + 29);
      pdf.text('4. Lamination: Fold along the center dotted line, insert into standard card pouch, and laminate.', 24, yBox + 35);

      // Footer metadata
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Card Holder: ${member.name} • Unique ID: ${displayCode} • Designation: ${member.designation}`, 105, yBox + 54, { align: 'center' });

      pdf.save(`AADHAAR_ID_CARD_${displayCode}_${member.name.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success('Official Aadhaar-size PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download PDF: ' + (err?.message || 'Please retry'));
    } finally {
      setDownloading(false);
    }
  };

  // 5. Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  const qrPayload = JSON.stringify({
    code: displayCode,
    name: member.name,
    fatherName: member.fatherName,
    designation: member.designation,
    village: member.village,
    mobile: member.mobile,
    role: member.role,
    status: member.status,
    issuedAt: member.approvedAt || member.createdAt,
    committee: settings.committeeName || 'Kishau Bandh Sangharsh Samiti'
  });

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Action Bar & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified & Active Record</span>
              </span>

              <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-full bg-slate-900 text-white shadow-xs">
                {displayCode}
              </span>

              {isAdmin && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                  ★ Chief Executive Administrator
                </span>
              )}

              {isPresident && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  ★ Central Committee President
                </span>
              )}

              {isOfficer && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                  Executive Council Officer
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Full official identity credential • Ready to download in Ultra-HD PNG, combined layout, or printable PDF.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Switch to true Aadhaar Card size' : 'Zoom in for large detailed inspection'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
            >
              {isZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isZoomed ? 'Aadhaar Size (85.6×54mm)' : 'Zoom View (+25%)'}</span>
            </button>

            <button
              onClick={downloadFrontPng}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Front PNG</span>
            </button>

            <button
              onClick={downloadBackPng}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Back PNG</span>
            </button>

            <button
              onClick={downloadCombinedPng}
              disabled={downloading}
              title="Download both Front and Back together in 1 high-resolution image"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition shadow-xs disabled:opacity-50"
            >
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>Both Sides PNG</span>
            </button>

            <button
              onClick={downloadPdf}
              disabled={downloading}
              title="Download print-ready PDF formatted for standard Aadhaar card (85.6 x 54 mm)"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Printable PDF (Aadhaar Size)</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 ml-1"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards Display Grid (Print friendly & standard Aadhaar size) */}
      <div
        className={`grid gap-6 items-start justify-center mx-auto transition-all print:flex print:flex-row print:justify-center print:gap-4 ${
          isZoomed
            ? 'grid-cols-1 max-w-2xl'
            : 'grid-cols-1 lg:grid-cols-2 max-w-4xl'
        }`}
      >
        {/* ==================== FRONT SIDE ==================== */}
        <div className="space-y-2 w-full flex flex-col items-center">
          <div
            className={`flex items-center justify-between w-full ${
              isZoomed ? 'max-w-[480px]' : 'max-w-[385px]'
            } px-1 print:hidden`}
          >
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Front Side (मुख पृष्ठ)
            </span>
            <span className="text-[10.5px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Aadhaar / PVC Size (85.6 × 54 mm)
            </span>
          </div>

          <div
            ref={cardFrontRef}
            id="id-card-front-container"
            className={`w-full ${
              isZoomed ? 'max-w-[480px] h-[303px]' : 'max-w-[385px] h-[243px]'
            } bg-white rounded-xl shadow-lg overflow-hidden border border-emerald-800/30 text-slate-900 relative flex flex-col justify-between select-none transition-all print:border print:border-slate-300`}
            style={{
              aspectRatio: '85.6 / 54',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Header Ribbon */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 px-2.5 py-1.5 text-white flex items-center gap-2 border-b border-amber-400 shrink-0">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Committee Logo"
                  crossOrigin="anonymous"
                  className="w-8 h-8 rounded-full object-cover border border-amber-300 bg-white shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-[12px] font-black uppercase tracking-tight text-amber-300 leading-none truncate">
                  {settings.committeeName || 'Kishau Bandh Sangharsh Samiti'}
                </h3>
                <p className="text-[9px] text-emerald-100 font-semibold tracking-wide leading-tight truncate mt-1">
                  किशाऊ बांध संघर्ष समिति • Mailoth Shambhar Kwanu
                </p>
              </div>
            </div>

            {/* Main Body */}
            <div className="px-2.5 py-1.5 flex gap-2.5 items-center flex-1 min-h-0 bg-gradient-to-b from-white to-slate-50/50">
              {/* Photo Box */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-[72px] h-[90px] rounded-lg overflow-hidden border border-emerald-900/40 shadow-xs bg-slate-100 relative">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                      <ShieldCheck className="w-6 h-6 opacity-40 text-slate-500" />
                      <span className="text-[8px] mt-0.5 font-semibold text-slate-500">Official Photo</span>
                    </div>
                  )}
                </div>
                <span className="mt-1 font-mono text-[8.5px] font-black text-emerald-950 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 shadow-2xs tracking-wider">
                  {displayCode}
                </span>
              </div>

              {/* Full Details Section */}
              <div className="flex-1 min-w-0 space-y-0.5 text-left">
                <div>
                  <h4 className="text-[13px] font-black text-slate-950 leading-tight truncate">
                    {member.name}
                  </h4>
                  <p className="text-[9.5px] text-slate-700 font-medium leading-tight truncate">
                    <span className="text-slate-500 font-normal">S/o or W/o:</span>{' '}
                    <span className="text-slate-900 font-bold">{member.fatherName || '—'}</span>
                  </p>
                </div>

                <div className="pt-0.5 space-y-0.5 text-[9px] text-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-500 shrink-0">पद (Designation):</span>
                    <span className="font-bold text-emerald-950 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 inline-block leading-tight text-[8.5px] truncate max-w-[165px]">
                      {formatDesignationDisplay(member.designation)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-500 shrink-0">ग्राम (Village):</span>
                    <span className="font-bold text-slate-900 truncate">{member.village}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-500 shrink-0">शिक्षा (Edu):</span>
                    <span className="font-medium text-slate-900 truncate">{member.education || 'Graduate'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-500 shrink-0">मोबाइल (Mobile):</span>
                    <span className="font-mono font-bold text-slate-950">{member.mobile}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Signatures & Authorities Section */}
            <div className="bg-slate-100/95 border-t border-slate-200 px-2 py-1 flex items-end justify-between gap-1 shrink-0 h-[48px]">
              {/* President (अध्यक्ष) Signature & Name Block - Omitted on President's own ID card */}
              {!isPresident ? (
                <div className="flex flex-col items-center text-center w-[125px] max-w-[40%] shrink-0">
                  <div className="h-4 flex items-end justify-center">
                    {settings.presidentSignatureUrl ? (
                      <img
                        src={settings.presidentSignatureUrl}
                        alt="President Signature"
                        crossOrigin="anonymous"
                        className="max-h-4 max-w-[80px] object-contain"
                      />
                    ) : (
                      <span className="font-serif italic text-[8px] text-slate-800 font-bold leading-none">
                        {presidentDisplayName}
                      </span>
                    )}
                  </div>
                  <div className="w-full border-t border-slate-400 mt-0.5 mb-0.5"></div>
                  <span className="text-[7.5px] font-black text-slate-950 leading-tight block truncate w-full">
                    {presidentDisplayName}
                  </span>
                  <span className="text-[6.5px] font-bold text-slate-600 uppercase tracking-tight block leading-none">
                    अध्यक्ष (President)
                  </span>
                </div>
              ) : (
                <div className="w-[125px] max-w-[40%] shrink-0 invisible" />
              )}

              {/* Center Official Verification Stamp */}
              <div className="flex flex-col items-center justify-end pb-0.5 shrink-0 px-0.5">
                <div className="text-center">
                  <span className="text-[6px] font-black text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 tracking-tight leading-tight block">
                    ✓ प्राधिकृत
                  </span>
                  <span className="text-[5.5px] text-slate-500 font-bold leading-tight block mt-0.5">
                    KBSS Official
                  </span>
                </div>
              </div>

              {/* Admin (व्यवस्थापक) Signature & Name Block - Omitted on Admin's own ID card */}
              {!isAdmin ? (
                <div className="flex flex-col items-center text-center w-[125px] max-w-[40%] shrink-0 ml-auto">
                  <div className="h-4 flex items-end justify-center">
                    {settings.adminSignatureUrl ? (
                      <img
                        src={settings.adminSignatureUrl}
                        alt="Admin Signature"
                        crossOrigin="anonymous"
                        className="max-h-4 max-w-[80px] object-contain"
                      />
                    ) : (
                      <span className="font-serif italic text-[8px] text-slate-800 font-bold leading-none">
                        {adminDisplayName}
                      </span>
                    )}
                  </div>
                  <div className="w-full border-t border-slate-400 mt-0.5 mb-0.5"></div>
                  <span className="text-[7.5px] font-black text-slate-950 leading-tight block truncate w-full">
                    {adminDisplayName}
                  </span>
                  <span className="text-[6.5px] font-bold text-slate-600 uppercase tracking-tight block leading-none">
                    व्यवस्थापक (Admin)
                  </span>
                </div>
              ) : (
                <div className="w-[125px] max-w-[40%] shrink-0 ml-auto invisible" />
              )}
            </div>
          </div>
        </div>

        {/* ==================== REVERSE SIDE ==================== */}
        <div className="space-y-2 w-full flex flex-col items-center">
          <div
            className={`flex items-center justify-between w-full ${
              isZoomed ? 'max-w-[480px]' : 'max-w-[385px]'
            } px-1 print:hidden`}
          >
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              Reverse Side (पृष्ठ भाग)
            </span>
            <span className="text-[10.5px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              Terms & Verification
            </span>
          </div>

          <div
            ref={cardBackRef}
            id="id-card-back-container"
            className={`w-full ${
              isZoomed ? 'max-w-[480px] h-[303px]' : 'max-w-[385px] h-[243px]'
            } bg-slate-950 text-white rounded-xl shadow-lg overflow-hidden border border-slate-800 relative flex flex-col justify-between p-2.5 select-none transition-all print:border print:border-slate-300`}
            style={{
              aspectRatio: '85.6 / 54',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Top Back Header & QR */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
              <div className="pr-2">
                <h4 className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider">
                  OFFICIAL TERMS & ACCREDITATION
                </h4>
                <p className="text-[8px] text-slate-300 font-medium leading-tight mt-0.5">
                  किशाऊ बांध विस्थापित एवं प्रभावित संघर्ष समिति
                </p>
                <p className="text-[7px] text-slate-400 leading-tight">
                  Non-transferable council identity credentials
                </p>
              </div>

              {/* Scanable QR Code */}
              <div className="p-1 bg-white rounded-lg shadow-sm shrink-0">
                <QRCodeSVG
                  value={qrPayload}
                  size={44}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Address & Verified Info */}
            <div className="space-y-1 text-[9px] text-slate-200 py-1">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-tight">
                  <strong className="text-white font-bold">Residential:</strong>{' '}
                  {member.address || 'Mailoth Shambhar Kwanu'}, Village {member.village}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="leading-tight">
                  <strong className="text-white font-bold">Emergency Contact:</strong>{' '}
                  <span className="font-mono text-emerald-300 font-bold">{member.mobile}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="leading-tight">
                  <strong className="text-white font-bold">Date of Accreditation:</strong>{' '}
                  {member.approvedAt
                    ? new Date(member.approvedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : new Date().toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                </p>
              </div>
            </div>

            {/* Council Demands & Security Footer */}
            <div className="border-t border-slate-800/80 pt-1.5 flex items-center justify-between text-[7.5px] text-slate-400">
              <span className="font-medium text-slate-300">
                Verified Member • Official ID
              </span>
              <span className="font-mono text-amber-400 font-black px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800 text-[8px]">
                {displayCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
