// Professional screenplay export utilities

import { Scene } from '@/types/screenplay';
import { SceneNumbering, RevisionColor } from '@/types/production';
import { escapeHtml, escapeXml } from './escape-utils';
import { downloadFile } from './dom-utils';

// Re-export downloadFile for backwards compatibility
export { downloadFile };

// Fountain format export
export function exportToFountain(
  title: string,
  author: string,
  content: string,
  metadata?: Record<string, string>
): string {
  let fountain = '';

  // Title page
  fountain += `Title: ${title}\n`;
  if (author) fountain += `Author: ${author}\n`;
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      fountain += `${key}: ${value}\n`;
    });
  }
  fountain += '\n';

  // Content (Fountain uses plain text with special markers)
  fountain += content;

  return fountain;
}

// Final Draft XML (FDX) export
export function exportToFDX(
  title: string,
  author: string,
  content: string,
  scenes: Scene[],
  sceneNumbering?: SceneNumbering
): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Type="Title">
          <Text>${escapeXml(title)}</Text>
        </Paragraph>
        <Paragraph Type="Authors">
          <Text>by</Text>
        </Paragraph>
        <Paragraph Type="Authors">
          <Text>${escapeXml(author)}</Text>
        </Paragraph>
      </Content>
    </TitlePage>
    ${generateFDXScenes(scenes, sceneNumbering)}
  </Content>
</FinalDraft>`;

  return xml;
}

function generateFDXScenes(scenes: Scene[], sceneNumbering?: SceneNumbering): string {
  return scenes.map((scene, index) => {
    const sceneNumber = sceneNumbering?.enabled
      ? `${sceneNumbering.prefix || ''}${sceneNumbering.startNumber + index}${sceneNumbering.suffix || ''}`
      : '';

    let sceneXml = `<Paragraph Type="Scene Heading"${sceneNumber ? ` Number="${sceneNumber}"` : ''}>
      <Text>${escapeXml(scene.heading)}</Text>
    </Paragraph>`;

    scene.elements.forEach(element => {
      switch (element.type) {
        case 'action':
          sceneXml += `
    <Paragraph Type="Action">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>`;
          break;
        case 'character':
          sceneXml += `
    <Paragraph Type="Character">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>`;
          break;
        case 'dialogue':
          sceneXml += `
    <Paragraph Type="Dialogue">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>`;
          break;
        case 'parenthetical':
          sceneXml += `
    <Paragraph Type="Parenthetical">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>`;
          break;
        case 'transition':
          sceneXml += `
    <Paragraph Type="Transition">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>`;
          break;
      }
    });

    return sceneXml;
  }).join('\n    ');
}

// escapeXml is now imported from escape-utils.ts

// HTML export for web preview
export function exportToHTML(
  title: string,
  author: string,
  content: string,
  revisionColor?: RevisionColor
): string {
  const colorClass = revisionColor && revisionColor !== 'white'
    ? `revision-${revisionColor}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: letter;
      margin: 1in 1in 1in 1.5in;
    }
    body {
      font-family: 'Courier Prime', 'Courier New', Courier, monospace;
      font-size: 12pt;
      line-height: 1.5;
      max-width: 6in;
      margin: 0 auto;
      padding: 1in;
      background: white;
      color: black;
    }
    .title-page {
      text-align: center;
      page-break-after: always;
      padding-top: 3in;
    }
    .title {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 1in;
      text-transform: uppercase;
    }
    .author {
      margin-bottom: 0.5in;
    }
    .scene-heading {
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 1em;
      margin-bottom: 0;
    }
    .action {
      margin: 1em 0;
    }
    .character {
      margin-left: 2in;
      margin-top: 1em;
      margin-bottom: 0;
      text-transform: uppercase;
    }
    .parenthetical {
      margin-left: 1.6in;
      margin-bottom: 0;
    }
    .dialogue {
      margin-left: 1.5in;
      margin-right: 1in;
      margin-bottom: 1em;
    }
    .transition {
      text-align: right;
      margin: 1em 0;
      text-transform: uppercase;
    }
    .revision-blue { background-color: #93c5fd; }
    .revision-pink { background-color: #fbcfe8; }
    .revision-yellow { background-color: #fef08a; }
    .revision-green { background-color: #86efac; }
    .revision-goldenrod { background-color: #fbbf24; }
    .revision-buff { background-color: #fed7aa; }
    .revision-salmon { background-color: #fdba74; }
    @media print {
      body { background: none; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body class="${colorClass}">
  <div class="title-page">
    <div class="title">${escapeHtml(title)}</div>
    <div class="author">by</div>
    <div class="author">${escapeHtml(author)}</div>
  </div>
  <div class="content">
    ${formatContentToHTML(content)}
  </div>
</body>
</html>`;
}

function formatContentToHTML(content: string): string {
  const lines = content.split('\n');
  let html = '';
  let inDialogue = false;

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed) {
      html += '<br>';
      inDialogue = false;
      return;
    }

    // Scene heading
    if (/^(INT|EXT|INT\/EXT|I\/E)[\.\s]/i.test(trimmed)) {
      html += `<div class="scene-heading">${escapeHtml(trimmed)}</div>`;
      inDialogue = false;
    }
    // Character name (uppercase line that's not a transition)
    else if (trimmed === trimmed.toUpperCase() &&
             !trimmed.includes('TO:') &&
             !trimmed.includes('IN:') &&
             trimmed.length < 40) {
      html += `<div class="character">${escapeHtml(trimmed)}</div>`;
      inDialogue = true;
    }
    // Parenthetical
    else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      html += `<div class="parenthetical">${escapeHtml(trimmed)}</div>`;
    }
    // Transition
    else if (trimmed.endsWith('TO:') || trimmed === 'FADE IN:' || trimmed === 'FADE OUT.') {
      html += `<div class="transition">${escapeHtml(trimmed)}</div>`;
      inDialogue = false;
    }
    // Dialogue
    else if (inDialogue) {
      html += `<div class="dialogue">${escapeHtml(trimmed)}</div>`;
    }
    // Action
    else {
      html += `<div class="action">${escapeHtml(trimmed)}</div>`;
      inDialogue = false;
    }
  });

  return html;
}

// escapeHtml is now imported from escape-utils.ts

// Plain text export with proper formatting
export function exportToPlainText(content: string): string {
  return content;
}

// Generate PDF-ready HTML (alias for exportToHTML for backwards compatibility)
export const generatePDFHTML = exportToHTML;

// downloadFile is now imported from dom-utils.ts and re-exported above
