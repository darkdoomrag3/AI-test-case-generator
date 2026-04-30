function escCsv(val) {
  const s = val == null ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsvRows(testCases) {
  const headers = [
    'ID',
    'Title',
    'Requirement refs',
    'Priority',
    'Severity',
    'Type',
    'Category',
    'Risk',
    'Automation candidate',
    'Automation notes',
    'Preconditions',
    'Test data',
    'Steps',
    'Expected result',
    'Postconditions',
    'Tags',
  ];
  const csvRows = [headers.join(',')];

  for (const tc of testCases) {
    const steps = Array.isArray(tc.steps) ? tc.steps : [];
    const stepsText = steps
      .map((s) => `${s.step}. ${s.action} -> Expected: ${s.expected}`)
      .join(' | ');
    const refs = Array.isArray(tc.requirementRefs)
      ? tc.requirementRefs.join('; ')
      : '';
    const tags = Array.isArray(tc.tags) ? tc.tags.join('; ') : '';
    const auto =
      tc.automation && typeof tc.automation === 'object'
        ? tc.automation
        : {};

    const row = [
      escCsv(tc.id || ''),
      escCsv(tc.title || ''),
      escCsv(refs),
      tc.priority || '',
      tc.severity || '',
      tc.type || '',
      tc.category || '',
      tc.risk || '',
      auto.candidate === true ? 'yes' : auto.candidate === false ? 'no' : '',
      escCsv(auto.notes || ''),
      escCsv(tc.preconditions || ''),
      escCsv(tc.testData || ''),
      escCsv(stepsText),
      escCsv(tc.expectedResult || ''),
      escCsv(tc.postconditions || ''),
      escCsv(tags),
    ];

    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

export function buildXmlDocument(testCases) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testcases>\n';

  for (const tc of testCases) {
    const steps = Array.isArray(tc.steps) ? tc.steps : [];
    const stepsXml = steps
      .map(
        (s) =>
          `      <step>\n        <index>${s.step}</index>\n        <content><![CDATA[${s.action || ''}]]></content>\n        <expected><![CDATA[${s.expected || ''}]]></expected>\n      </step>`,
      )
      .join('\n');

    const refs = Array.isArray(tc.requirementRefs)
      ? tc.requirementRefs.join(',')
      : '';
    const tags = Array.isArray(tc.tags) ? tc.tags.join(',') : '';
    const auto =
      tc.automation && typeof tc.automation === 'object'
        ? tc.automation
        : {};

    xml += `  <testcase>\n`;
    xml += `    <id>${tc.id || ''}</id>\n`;
    xml += `    <title><![CDATA[${tc.title || ''}]]></title>\n`;
    xml += `    <requirementRefs>${refs}</requirementRefs>\n`;
    xml += `    <priority>${tc.priority || ''}</priority>\n`;
    xml += `    <severity>${tc.severity || ''}</severity>\n`;
    xml += `    <type>${tc.type || ''}</type>\n`;
    xml += `    <category>${tc.category || ''}</category>\n`;
    xml += `    <risk>${tc.risk || ''}</risk>\n`;
    xml += `    <automation_candidate>${auto.candidate === true}</automation_candidate>\n`;
    xml += `    <automation_notes><![CDATA[${auto.notes || ''}]]></automation_notes>\n`;
    xml += `    <preconditions><![CDATA[${tc.preconditions || ''}]]></preconditions>\n`;
    xml += `    <testdata><![CDATA[${tc.testData || ''}]]></testdata>\n`;
    xml += `    <steps>\n${stepsXml}\n    </steps>\n`;
    xml += `    <expected><![CDATA[${tc.expectedResult || ''}]]></expected>\n`;
    xml += `    <postconditions><![CDATA[${tc.postconditions || ''}]]></postconditions>\n`;
    xml += `    <tags>${tags}</tags>\n`;
    xml += `  </testcase>\n`;
  }

  xml += '</testcases>';
  return xml;
}

export function buildMarkdownDocument(suite, testCases) {
  const s = suite && typeof suite === 'object' ? suite : {};
  let md = `# Test suite: ${s.featureName || 'Feature'}\n\n`;
  md += `**Platform:** ${s.platform || '—'}  \n`;
  md += `**Scope:** ${s.scope || '—'}\n\n`;
  if (s.summary) {
    md += `## Summary\n\n${s.summary}\n\n`;
  }
  if (Array.isArray(s.assumptions) && s.assumptions.length) {
    md += `## Assumptions\n\n`;
    s.assumptions.forEach((a) => {
      md += `- ${a}\n`;
    });
    md += `\n`;
  }
  if (Array.isArray(s.openQuestions) && s.openQuestions.length) {
    md += `## Open questions\n\n`;
    s.openQuestions.forEach((q) => {
      md += `- ${q}\n`;
    });
    md += `\n`;
  }
  if (Array.isArray(s.risks) && s.risks.length) {
    md += `## Risks\n\n`;
    s.risks.forEach((r) => {
      md += `- ${r}\n`;
    });
    md += `\n`;
  }

  md += `## Test cases\n\n`;

  for (const tc of testCases) {
    const steps = Array.isArray(tc.steps) ? tc.steps : [];
    md += `### ${tc.id || ''} — ${tc.title || ''}\n\n`;
    md += `- **Priority:** ${tc.priority || '—'} | **Severity:** ${tc.severity || '—'} | **Type:** ${tc.type || '—'}\n`;
    md += `- **Category:** ${tc.category || '—'} | **Risk:** ${tc.risk || '—'}\n`;
    if (Array.isArray(tc.requirementRefs) && tc.requirementRefs.length) {
      md += `- **Requirement refs:** ${tc.requirementRefs.join(', ')}\n`;
    }
    if (tc.automation?.notes != null || tc.automation?.candidate != null) {
      md += `- **Automation:** ${tc.automation?.candidate === true ? 'candidate' : tc.automation?.candidate === false ? 'not candidate' : '—'} — ${tc.automation?.notes || ''}\n`;
    }
    md += `\n`;
    if (tc.preconditions) {
      md += `**Preconditions:** ${tc.preconditions}\n\n`;
    }
    if (tc.testData) {
      md += `**Test data:** ${tc.testData}\n\n`;
    }
    md += `| Step | Action | Expected |\n| --- | --- | --- |\n`;
    steps.forEach((st) => {
      md += `| ${st.step} | ${String(st.action || '').replace(/\|/g, '\\|')} | ${String(st.expected || '').replace(/\|/g, '\\|')} |\n`;
    });
    md += `\n**Expected result:** ${tc.expectedResult || '—'}\n\n`;
    if (tc.postconditions) {
      md += `**Postconditions:** ${tc.postconditions}\n\n`;
    }
    if (Array.isArray(tc.tags) && tc.tags.length) {
      md += `**Tags:** ${tc.tags.join(', ')}\n\n`;
    }
    md += `---\n\n`;
  }

  return md;
}
