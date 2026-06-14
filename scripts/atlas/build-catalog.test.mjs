import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lutCode, carveCode, sideOf, prettyArea, lobeOfHostStem, lobeOfDestrieux, lobeOfDktName, lobeOfJulichName } from './build-catalog.mjs'

test('lutCode normalisiert je Layer', () => {
  assert.equal(lutCode('dkt', 'parstriangularis'), 'parstriangularis')
  assert.equal(lutCode('julich', 'Area 44 (IFG)'), '44')
  assert.equal(lutCode('julich', 'Area 6d1 (PreCG)'), '6d1')
  assert.equal(lutCode('julich', 'Area s32 (sACC)'), 's32')
  assert.equal(lutCode('brodmann', 'BA44'), '44')
})

test('carveCode extrahiert den Join-Code', () => {
  assert.equal(carveCode('dkt', 'parstriangularis-l'), 'parstriangularis')
  assert.equal(carveCode('julich', 'julich3-area-44-ifg-l'), '44')
  assert.equal(carveCode('julich', 'julich3-area-s32-sacc-l'), 's32')
  assert.equal(carveCode('brodmann', 'brodmann-ba44-cingulate-gyrus-l'), '44')
})

test('sideOf liest L/R', () => {
  assert.equal(sideOf('parstriangularis-l'), 'L')
  assert.equal(sideOf('brodmann-ba44-cingulate-gyrus-r'), 'R')
})

test('prettyArea baut Anzeigenamen', () => {
  assert.equal(prettyArea('julich', 'Area 44 (IFG)', 'L'), 'Area 44 (IFG) · L')
  assert.equal(prettyArea('brodmann', 'BA44', 'R'), 'BA44 · R')
})

test('lobeOf* (Carve-Host + Name-Fallbacks)', () => {
  assert.equal(lobeOfHostStem('inferior-frontal-gyrus'), 'frontal')
  assert.equal(lobeOfHostStem('cingulate-gyrus'), 'limbic')
  assert.equal(lobeOfDestrieux('G_front_inf-Triangul'), 'frontal')
  assert.equal(lobeOfDestrieux('S_calcarine'), 'occipital')
  assert.equal(lobeOfDktName('bankssts'), 'temporal')
  assert.equal(lobeOfDktName('parstriangularis'), 'frontal')
  assert.equal(lobeOfJulichName('Area 44 (IFG)'), 'frontal')
  assert.equal(lobeOfJulichName('Area 7A (SPL)'), 'parietal')
})
