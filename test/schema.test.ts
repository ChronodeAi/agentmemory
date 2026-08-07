import { describe, it, expect } from 'vitest'
import { KV, STREAM, generateId, jaccardSimilarity } from '../src/state/schema.js'

describe('KV', () => {
  it('has correct session scope', () => {
    expect(KV.sessions).toBe('mem:sessions')
  })

  it('generates observation scope with session ID', () => {
    expect(KV.observations('ses_123')).toBe('mem:obs:ses_123')
  })

  it('has correct summaries scope', () => {
    expect(KV.summaries).toBe('mem:summaries')
  })
})

describe('STREAM', () => {
  it('has correct name', () => {
    expect(STREAM.name).toBe('mem-live')
  })

  it('group returns session ID', () => {
    expect(STREAM.group('ses_123')).toBe('ses_123')
  })
})

describe('generateId', () => {
  it('includes prefix', () => {
    expect(generateId('obs')).toMatch(/^obs_/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')))
    expect(ids.size).toBe(100)
  })

  it('has sufficient length', () => {
    const id = generateId('obs')
    expect(id.length).toBeGreaterThan(15)
  })
})

describe('jaccardSimilarity', () => {
  it('preserves word-level similarity for ASCII text', () => {
    const score = jaccardSimilarity(
      'always validate the bearer token before routing',
      'always validate the bearer token before dispatch',
    )
    expect(score).toBeGreaterThan(0.5)
    expect(score).toBeLessThan(1)
  })

  it('uses exact normalized equality when short text has no tokens', () => {
    expect(jaccardSimilarity('AI', 'AI')).toBe(1)
    expect(jaccardSimilarity('AI', 'ML')).toBe(0)
    expect(jaccardSimilarity('a b', 'a  b')).toBe(1)
    expect(jaccardSimilarity('a b', 'x y')).toBe(0)
  })

  it('distinguishes unrelated CJK text and matches near-identical text', () => {
    expect(jaccardSimilarity('北京', '上海')).toBe(0)
    expect(
      jaccardSimilarity(
        '用户认证中间件必须先去除请求头里的前缀然后再校验令牌',
        '用户认证中间件必须先去除请求头里的前缀然后校验令牌',
      ),
    ).toBeGreaterThan(0.7)
  })

  it('normalizes composed and decomposed Unicode', () => {
    expect(jaccardSimilarity('caf\u00e9 latte order', 'cafe\u0301 latte order')).toBe(1)
  })
})
