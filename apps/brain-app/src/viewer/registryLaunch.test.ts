import { describe, expect, it } from 'vitest'
import {
  REGISTRY_LAUNCH_SCHEMA_VERSION,
  appModeForRegistryLaunch,
  parseRegistryLaunch,
  parseRegistryLaunchFromSearch,
  registryLaunchLocation,
  resolveRegistryLaunch,
} from './registryLaunch'

describe('registry launch contract', () => {
  it('oeffnet Phineas ueber Collection, Kontext und EntryPoint statt ueber Fallnamen', () => {
    const launch = resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'phineas-gage',
    })

    expect(launch).toEqual({
      schemaVersion: REGISTRY_LAUNCH_SCHEMA_VERSION,
      collectionId: 'case-phineas-gage',
      contextId: 'phineas-gage',
      entrypoint: { kind: 'case-study', caseStudyId: 'phineas-gage' },
    })
    expect(appModeForRegistryLaunch(launch)).toBe('explore')
  })

  it('rundet Registry-Launches durch URL-Parameter stabil', () => {
    const launch = resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'phineas-gage',
    })
    const location = registryLaunchLocation(launch)

    expect(location).toBe('?collectionId=case-phineas-gage&contextId=phineas-gage&entrypoint=case-study%3Aphineas-gage&mode=explore&case-study=phineas-gage')
    expect(parseRegistryLaunchFromSearch(location)).toEqual(launch)
  })

  it('leitet Scene-EntryPoints aus Bonus-Kontext-Hints ab', () => {
    const launch = resolveRegistryLaunch({
      collectionId: 'device-eeg-10-20',
      contextId: 'eeg-erp-p3a-konfliktmonitoring',
    })

    expect(launch.entrypoint).toEqual({
      kind: 'scene',
      sceneId: 'p3a-konfliktmonitoring',
      configName: 'p3a-konfliktmonitoring',
      step: 0,
    })
    expect(appModeForRegistryLaunch(launch)).toBe('learn')
    expect(registryLaunchLocation(launch)).toBe(
      '?collectionId=device-eeg-10-20&contextId=eeg-erp-p3a-konfliktmonitoring&entrypoint=scene%3Ap3a-konfliktmonitoring&config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0',
    )
  })

  it('weist unbekannte oder falsch zugeordnete Kontexte laut zurueck', () => {
    expect(() => resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'fehlt',
    })).toThrow(/contextId/)

    expect(() => resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'eeg-erp-vcpt',
    })).toThrow(/gehoert nicht/)

    expect(() => parseRegistryLaunchFromSearch('?collectionId=case-phineas-gage')).toThrow(/collectionId und contextId/)
  })

  it('parst nur versionierte Launch-Dokumente', () => {
    const launch = resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'phineas-gage',
    })

    expect(parseRegistryLaunch(launch)).toEqual(launch)
    expect(() => parseRegistryLaunch({ ...launch, schemaVersion: 999 })).toThrow(/schemaVersion/)
  })
})
