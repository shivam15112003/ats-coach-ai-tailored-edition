import {escapeLatex,extractResumeHeader} from './resumeLatex';

/** Convert generated letter text to editable TeX. All text is escaped as data. */
export function buildCoverLetterLatex(markdown:string,originalResume:string):string{
  const header=extractResumeHeader(originalResume);
  const plain=(s:string)=>s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)')
    .replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1')
    .replace(/^\s*[-*_]{3,}\s*$/gm,'');
  const body=plain(markdown).trim().split(/\n\s*\n/).filter(Boolean)
    .map(p=>p.split('\n').map(line=>escapeLatex(line.trim())).join('\\\\\n')).join('\n\n');
  const contacts=header.contacts.map(c=>escapeLatex(c.text)).join(String.raw` \textbar{} `);
  return String.raw`% Editable cover letter
\documentclass[letterpaper,11pt]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern}
\usepackage[hidelinks]{hyperref}
\input{glyphtounicode}
\pdfgentounicode=1
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.8em}
\begin{document}
${header.name?String.raw`{\Large\bfseries ${escapeLatex(header.name)}}\par`:''}
${contacts?String.raw`{\small ${contacts}}\par\vspace{0.4em}`:''}
${body}
\end{document}
`;
}
