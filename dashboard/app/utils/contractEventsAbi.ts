import type { AbiEvent } from 'viem'

// Union of every event fragment across the bundled V1 ABIs. Event signatures are
// (near-)globally unique, so decoding any contract's logs against this union
// resolves names without needing to pick the exact per-type ABI. Signatures are
// stable enough across generations that legacy logs decode too.
const modules = import.meta.glob('../artifacts/abi/V1/json/*.json', { eager: true })

const seen = new Set<string>()
const events: AbiEvent[] = []

for (const mod of Object.values(modules)) {
  const abi = ((mod as { default?: unknown }).default ?? mod) as unknown
  if (!Array.isArray(abi)) continue
  for (const item of abi as AbiEvent[]) {
    if (item?.type !== 'event') continue
    const sig = `${item.name}(${(item.inputs ?? []).map(i => i.type).join(',')})`
    if (seen.has(sig)) continue
    seen.add(sig)
    events.push(item)
  }
}

export const EVENT_ABI: AbiEvent[] = events
