import { jsPDF } from 'jspdf';
import { UserProfile, Registration, Score } from '../types';

export const generateCertificate = (
  user: UserProfile, 
  registration: Registration, 
  scores: Score[], 
  isWinner: boolean
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Futuristic Background Colors
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Borders
  doc.setDrawColor(34, 211, 238); // cyan-400
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  doc.setDrawColor(168, 85, 247); // purple-500
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header
  doc.setTextColor(34, 211, 238);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.text('SONIC ARENA', pageWidth / 2, 40, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('CERTIFICATE OF RECOGNITION', pageWidth / 2, 60, { align: 'center' });

  // Status Badge
  if (isWinner) {
    doc.setFillColor(255, 215, 0); // Gold
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.text('CHAMPION', pageWidth / 2, 80, { align: 'center' });
  } else {
    doc.setFillColor(34, 211, 238);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text('PARTICIPANT', pageWidth / 2, 80, { align: 'center' });
  }

  // Content
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('THIS TERMINAL CONFIRMS THAT', pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 211, 238);
  doc.text(user.displayName.toUpperCase(), pageWidth / 2, 120, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const eventName = registration.competitionType === 'battle' ? 'SOUND SYSTEM BATTLE' : 'MINIATURE SEMINAR';
  doc.text(`HAS SUCCESSFULLY COMPETED IN THE ${eventName}`, pageWidth / 2, 140, { align: 'center' });

  // Scores Summary
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b.totalScore, 0) / scores.length).toFixed(2) : 'N/A';
  doc.setFontSize(12);
  doc.text(`CALIBRATION MAGNITUDE: ${avgScore} / 40.00`, pageWidth / 2, 160, { align: 'center' });

  // Footnote
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Verification ID: ${user.uid.substring(0, 12).toUpperCase()}`, pageWidth / 2, 185, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 192, { align: 'center' });

  // Save
  doc.save(`${user.displayName.replace(/\s+/g, '_')}_SonicArena.pdf`);
};
