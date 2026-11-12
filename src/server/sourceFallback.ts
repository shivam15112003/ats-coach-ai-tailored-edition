import {jsPDF} from "jspdf";
export function sourceOnlyPdf(original:string):{pdfBase64:string;pages:number}{
  const doc=new jsPDF({unit:"pt",format:"letter"});
  doc.setFont("times","normal");doc.setFontSize(10);
  const lines=doc.splitTextToSize(original.replace(/[\u2013\u2014]/g,"-"),540) as string[];
  let y=40;
  for(const line of lines){if(y>752){doc.addPage();y=40;}doc.text(line,36,y);y+=12;}
  return {pdfBase64:Buffer.from(doc.output("arraybuffer")).toString("base64"),pages:doc.getNumberOfPages()};
}
