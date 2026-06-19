#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

const checkedFiles = [
  'README.md',
  'PRODUCT.md',
  'DESIGN.md',
  'CLAUDE.md',
  'apps/brain-app/README.md',
  'apps/brain-app/PRODUCT.md',
  'apps/brain-app/DESIGN.md',
  'docs/ARCHITECTURE.md',
  'docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md',
  'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md',
]

const rules = [
  {
    id: 'old-mode-count',
    pattern: /Drei Grundmodi|vier Modus-Karten/i,
    allow: (file) => file === 'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md',
  },
  {
    id: 'old-shell-routes',
    pattern: /\bT6\b|\/deck|\/editor|src\/features/i,
    allow: (file, line, lineNumber) =>
      file === 'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md' ||
      (file === 'apps/brain-app/DESIGN.md' && lineNumber >= 6 && lineNumber <= 7),
  },
  {
    id: 'old-companion-contract',
    pattern:
      /Companion-Text|Companion-Atlas|Companion-Exploration|Dozenten-Companion|Participants nutzen den Companion|Im Companion|public\/companion/i,
    allow: (file) => file === 'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md',
  },
  {
    id: 'old-color-groups-path',
    pattern: /colors\.groups/i,
    allow: (file, line) =>
      file === 'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md' ||
      (file === 'README.md' && /kein aktueller/.test(line)) ||
      (file === 'docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md' && /kein aktueller Pfad/.test(line)),
  },
]

const requiredAnchors = [
  {
    file: 'README.md',
    required: ['docs/ARCHITECTURE.md', 'scripts/atlas/config.default.toml'],
  },
  {
    file: 'apps/brain-app/README.md',
    required: ['../../docs/ARCHITECTURE.md', '../../scripts/atlas/config.default.toml'],
  },
  {
    file: 'apps/brain-app/PRODUCT.md',
    required: ['../../PRODUCT.md', '../../DESIGN.md', '../../docs/ARCHITECTURE.md'],
  },
  {
    file: 'docs/ARCHITECTURE.md',
    required: [
      'PRODUCT.md',
      'DESIGN.md',
      'CLAUDE.md',
      'scripts/atlas/README.md',
      'docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md',
      'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md',
    ],
  },
  {
    file: 'docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md',
    required: ['scripts/check-doc-drift.mjs', 'pnpm --dir apps/brain-app docs:drift'],
  },
]

const failures = []

function readProjectFile(file) {
  const absolute = resolve(root, file)
  return readFileSync(absolute, 'utf8')
}

for (const file of checkedFiles) {
  const text = readProjectFile(file)
  const lines = text.split(/\r?\n/)

  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (!rule.pattern.test(line)) continue
      if (rule.allow(file, line, index + 1)) continue
      failures.push(`${file}:${index + 1} ${rule.id}: ${line.trim()}`)
    }
  })
}

for (const anchor of requiredAnchors) {
  const text = readProjectFile(anchor.file)
  for (const required of anchor.required) {
    if (text.includes(required)) continue
    failures.push(`${anchor.file}: missing required anchor "${required}"`)
  }
}

if (failures.length > 0) {
  console.error('Docs drift check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Docs drift check passed for ${checkedFiles.length} files from ${relative(process.cwd(), root) || '.'}`)
