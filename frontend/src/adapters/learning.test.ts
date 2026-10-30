import { expect, it } from 'vitest'
import { analyse, classify, MAX_ANSWER_LENGTH } from './learning'

it('gives distinct, sourced feedback for distinct answers', () => {
  const a = analyse('A', '这是过拟合，我会正则化并检查验证集')
  const b = analyse('B', '训练和验证结果不同')
  expect(a.feedback).not.toBe(b.feedback)
  expect(a.source).toBe('current_local_session')
  expect(b.mode).toBe('rule_baseline')
})

it('rejects empty evidence', () => {
  expect(() => analyse('A', ' ')).toThrow('请先填写回答')
})

it('exposes testable signals and checks for the overfitting case', () => {
  const c = classify('这是过拟合，我会加 Dropout 并简化模型')
  expect(c.signals).toEqual({ concept: true, evidence: false, action: true })
  expect(c.checks).toEqual(['concept:命中过拟合术语', 'action:命中可检验干预'])
  expect(c.tier).toBe('rule_inferred')
  expect(c.diagnosis).toBe('已识别过拟合概念')
})

it('falls back to the weakest branch when no clue is present', () => {
  const c = classify('我不知道，随便猜一下')
  expect(c.signals).toEqual({ concept: false, evidence: false, action: false })
  expect(c.checks).toEqual([])
  expect(c.diagnosis).toBe('尚未指出训练与验证差距')
})

it('is case-insensitive for Latin action keywords', () => {
  expect(classify('add DROPOUT').signals.action).toBe(true)
})

it('rejects oversized answers and keeps the boundary value', () => {
  expect(() => analyse('A', '过'.repeat(MAX_ANSWER_LENGTH + 1))).toThrow('回答过长')
  expect(analyse('A', '过'.repeat(MAX_ANSWER_LENGTH)).answer).toHaveLength(MAX_ANSWER_LENGTH)
})

it('writes a full evidence record with tier and timestamps', () => {
  const r = analyse('A', '验证集差 21 个点，可能是过拟合，我打算用早停')
  expect(r.tier).toBe('rule_inferred')
  expect(r.signals).toEqual({ concept: true, evidence: true, action: true })
  expect(r.answer).toBe('验证集差 21 个点，可能是过拟合，我打算用早停')
  expect(Number.isNaN(Date.parse(r.createdAt))).toBe(false)
})
