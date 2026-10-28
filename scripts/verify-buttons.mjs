import fs from 'node:fs';
import path from 'node:path';

function getOpeningTagAttributes(content, startIndex) {
  let index = startIndex + '<button'.length;
  let inString = false;
  let stringChar = '';
  let braceDepth = 0;
  while (index < content.length) {
    const ch = content[index];
    if (inString) {
      if (ch === stringChar && content[index - 1] !== '\\') {
        inString = false;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
    } else if (ch === '{') {
      braceDepth++;
    } else if (ch === '}') {
      braceDepth--;
    } else if (ch === '>' && braceDepth === 0) {
      return { attrs: content.substring(startIndex + '<button'.length, index), endIndex: index };
    }
    index++;
  }
  return null;
}

export function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  let count = 0;
  let searchIndex = 0;
  while ((searchIndex = content.indexOf('<button', searchIndex)) !== -1) {
    const parsed = getOpeningTagAttributes(content, searchIndex);
    if (!parsed) {
      searchIndex += 7;
      continue;
    }
    count++;
    const attrs = parsed.attrs;
    const line = content.substring(0, searchIndex).split('\n').length;
    
    // Check className has ms-btn
    const classMatch = attrs.match(/className=(?:\{`([^`]*)`\}|\{["']([^"']*)["']\}|["']([^"']*)["'])/);
    const classVal = classMatch ? (classMatch[1] || classMatch[2] || classMatch[3]) : '';
    const hasMsBtn = /\bms-btn\b|\bms-btn--|\bms-btn-primary\b|\bms-btn-secondary\b|\bms-btn-ghost\b/.test(classVal);
    
    // Check inline style for background / border
    const styleMatch = attrs.match(/style=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
    const styleVal = styleMatch ? styleMatch[1] : '';
    const hasInlineBg = /\bbackground(?:Color)?\s*:/.test(styleVal);
    const hasInlineBorder = /\bborder(?:Color|Width|Style)?\s*:/.test(styleVal);

    if (!hasMsBtn || hasInlineBg || hasInlineBorder) {
      issues.push({
        line,
        hasMsBtn,
        hasInlineBg,
        hasInlineBorder,
        classVal: classVal.slice(0, 40),
        styleVal: styleVal.slice(0, 40)
      });
    }
    searchIndex = parsed.endIndex;
  }
  return { file: filePath, count, issues };
}

const targetFiles = process.argv.slice(2);
let files = [];
if (targetFiles.length > 0) {
  files = targetFiles;
} else {
  if (fs.existsSync('src/screens')) {
    files.push(...fs.readdirSync('src/screens').filter(f => f.endsWith('.tsx')).map(f => path.join('src/screens', f)));
  }
  if (fs.existsSync('src/components')) {
    files.push(...fs.readdirSync('src/components').filter(f => f.endsWith('.tsx')).map(f => path.join('src/components', f)));
  }
  files.push(...fs.readdirSync('src').filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx')).map(f => path.join('src', f)));
}

let totalButtons = 0;
let totalIssues = 0;

for (const f of files) {
  const r = checkFile(f);
  totalButtons += r.count;
  totalIssues += r.issues.length;
  if (r.issues.length > 0) {
    console.log(`❌ ${r.file} (${r.issues.length}/${r.count} issues):`);
    for (const is of r.issues) {
      console.log(`   L${is.line}: ms-btn=${is.hasMsBtn}, bg=${is.hasInlineBg}, border=${is.hasInlineBorder} | class: [${is.classVal}]`);
    }
  } else if (r.count > 0) {
    console.log(`✅ ${r.file} (${r.count} buttons OK)`);
  }
}
console.log(`\nTotal: ${totalButtons} buttons checked, ${totalIssues} issues found.`);
