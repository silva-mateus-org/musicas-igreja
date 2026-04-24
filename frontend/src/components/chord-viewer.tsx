'use client';

import React, { useMemo } from 'react';
import { parseChordProDocument, transposeChordProText, ChordProSection, ChordProLine } from '@/lib/chordpro';

interface ChordViewerProps {
  content: string;
  transposeAmount?: number;
  capoFret?: number;
  arrangementJson?: string;
  className?: string;
  fontSize?: number;
  showChords?: boolean;
  chordColor?: string;
  columnView?: boolean;
}

export function ChordViewer({ 
  content, 
  transposeAmount = 0, 
  capoFret = 0,
  arrangementJson,
  className = '',
  fontSize = 16,
  showChords = true,
  chordColor = 'text-primary',
  columnView = false
}: ChordViewerProps) {
  
  // Total transposition is the sum of transpose and capo
  const totalSteps = transposeAmount + capoFret;

  // Memoize the transposed content and parsing
  const document = useMemo(() => {
    const transposedText = transposeChordProText(content, totalSteps);
    return parseChordProDocument(transposedText);
  }, [content, totalSteps]);

  // Determine the sequence of sections to render
  const renderSections = useMemo(() => {
    if (!arrangementJson) return document.sections;

    try {
      const arrangement: string[] = JSON.parse(arrangementJson);
      if (!Array.isArray(arrangement) || arrangement.length === 0) return document.sections;

      const orderedSections: ChordProSection[] = [];
      for (const sectionId of arrangement) {
        // Find section by id (e.g. sec-1) or label (e.g. "Refrão")
        const sec = document.sections.find(s => s.id === sectionId || s.label === sectionId);
        if (sec) orderedSections.push({ ...sec, id: `${sec.id}-${orderedSections.length}` }); // unique ID for React keys
      }
      return orderedSections.length > 0 ? orderedSections : document.sections;
    } catch {
      return document.sections;
    }
  }, [document.sections, arrangementJson]);

  const renderLine = (line: ChordProLine, lineIdx: number) => {
    // Handle Directives
    if (line.nodes.length === 1 && line.nodes[0].type === 'directive') {
      const dir = line.nodes[0];
      if (dir.directiveName === 'title' || dir.directiveName === 't' || 
          dir.directiveName === 'subtitle' || dir.directiveName === 'st') {
        return null;
      }
      if (dir.directiveName === 'comment' || dir.directiveName === 'c') {
        return <div key={lineIdx} className={`font-semibold ${chordColor} mt-4 mb-1 text-[0.9em]`}>{dir.value}</div>;
      }
      return null;
    }

    // Render Chords + Lyrics
    const hasChords = line.nodes.some(n => n.type === 'chord');
    
    if (!hasChords || !showChords) {
      const text = line.nodes
        .filter(n => n.type === 'text')
        .map(n => n.value)
        .join('');
      // Empty line
      if (!text.trim()) return <div key={lineIdx} className="h-[1em]" />;
      return <div key={lineIdx} className="min-h-[1.2em]">{text}</div>;
    }

    // Build chord-text segments: each segment has a chord (optional) and text
    const segments: Array<{ chord?: string; text: string }> = [];
    let currentChord: string | undefined = undefined;
    
    for (const node of line.nodes) {
      if (node.type === 'chord') {
        currentChord = node.value;
      } else if (node.type === 'text') {
        segments.push({ chord: currentChord, text: node.value });
        currentChord = undefined;
      }
    }
    // trailing chord with no text
    if (currentChord) {
      segments.push({ chord: currentChord, text: '\u00A0' });
    }

    return (
      <div key={lineIdx} className="flex flex-wrap items-end mb-1">
        {segments.map((seg, segIdx) => (
          <span key={segIdx} className="inline-flex flex-col align-bottom">
            <span className={`text-[0.85em] font-bold ${chordColor} leading-tight min-h-[1.25em] ${seg.chord ? '' : 'invisible'}`}>
              {seg.chord || '\u00A0'}
            </span>
            <span className="whitespace-pre leading-normal">{seg.text}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`font-sans leading-relaxed whitespace-pre-wrap ${className}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Sections Rendering */}
      <div className={columnView ? 'columns-1 md:columns-2 lg:columns-3 gap-8 space-y-0' : 'space-y-0'}>
        {renderSections.map((section) => (
          <div 
            key={section.id} 
            className={`mb-6 break-inside-avoid-column ${section.type === 'chorus' ? 'border-l-4 border-primary/30 pl-4 bg-muted/30 py-2 rounded-r-md' : ''}`}
          >
            {section.label && section.type !== 'other' && (
              <div className={`font-semibold ${chordColor} mb-2 text-[0.8em] uppercase tracking-wider`}>
                {section.label}
              </div>
            )}
            {section.lines.map((line, idx) => renderLine(line, idx))}
          </div>
        ))}
      </div>
    </div>
  );
}
