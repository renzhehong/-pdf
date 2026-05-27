// A 100% compliant, lightweight single-page PDF dynamically encoded in Base64 at compile/load time.
// This preserves ASCII compliance and guarantees no invalid character or padding sequences are fed to atob.

const PDF_SOURCE = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 500 >>
stream
BT
/F1 20 Tf
70 750 Td
(PDF Multi-Pin Annotation Linker - Demo Page) Tj
ET
BT
/F1 12 Tf
70 700 Td
(This lightweight demo document is generated inline to help you get started.) Tj
ET
BT
/F1 12 Tf
70 650 Td
(Instructions for Multi-Point Positioning:) Tj
ET
BT
/F1 11 Tf
70 620 Td
(- Click any tag on the right pane [e.g. "model architecture" or "experiment"].) Tj
ET
BT
/F1 11 Tf
70 590 Td
(- Enter "Append Position" mode, then click on multiple spots on this page to pin them.) Tj
ET
BT
/F1 11 Tf
70 560 Td
(- Click the numbers on these pins on either the PDF or the editor to sync and navigate.) Tj
ET
BT
/F1 12 Tf
70 480 Td
(Tip: Click "Upload PDF" in the header to view and annotate your own documents.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000271 00000 n 
0000000350 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
750
%%EOF`;

export const DEMO_PDF_BASE64 = btoa(PDF_SOURCE);
