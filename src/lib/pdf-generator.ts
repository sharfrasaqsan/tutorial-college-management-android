import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const generateStudentPaymentHistoryPDF = async (payments: any[], student: any) => {
  if (!student || !payments) return;

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const paymentRows = payments.map(p => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px; font-size: 12px; color: #1e293b;">${new Date(p.createdAt?.seconds * 1000 || p.createdAt).toLocaleDateString()}</td>
      <td style="padding: 12px; font-size: 12px; color: #1e293b; text-transform: uppercase; font-weight: bold;">${p.month || 'N/A'}</td>
      <td style="padding: 12px; font-size: 12px; color: #64748b;">${p.className || p.subject || 'Standard Fee'}</td>
      <td style="padding: 12px; font-size: 12px; color: #0f172a; font-weight: 900; text-align: right;">LKR ${p.amount?.toLocaleString()}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
          .logo { color: #6366f1; font-size: 24px; font-weight: 900; }
          .title { color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
          .meta { text-align: right; }
          .meta-item { font-size: 10px; color: #64748b; margin-bottom: 4px; }
          .student-info { margin-bottom: 40px; }
          .student-label { font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
          .student-name { font-size: 20px; font-weight: 900; color: #1e293b; }
          .student-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          .summary-card { background: #6366f1; border-radius: 12px; padding: 20px; color: white; margin-bottom: 40px; width: 200px; margin-left: auto; }
          .summary-label { font-size: 10px; font-weight: 900; opacity: 0.8; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: 900; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 12px; font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SMART ACADEMY</div>
            <div class="title">Student Payment Statement</div>
          </div>
          <div class="meta">
            <div class="meta-item">DATE: ${new Date().toLocaleDateString()}</div>
            <div class="meta-item">RECORDS: ${payments.length}</div>
          </div>
        </div>

        <div class="student-info">
          <div class="student-label">Student Details</div>
          <div class="student-name">${student.name}</div>
          <div class="student-sub">ID: ${student.studentId || student.id} • Grade: ${student.grade || 'N/A'}</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">Total Settlement</div>
          <div class="summary-value">LKR ${totalPaid.toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Cycle</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows}
          </tbody>
        </table>

        <div class="footer">
          This is a system-generated statement. Official Smart Academy Financial Record.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
    } else {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
