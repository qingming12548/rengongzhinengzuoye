export type StudentId = 'A' | 'B'
/** 证据层级：observed_input=原文照录；rule_inferred=规则推断，需教师复核。本文件不输出任何分数或等级。 */
export type Tier = 'observed_input' | 'rule_inferred'
export type Signals = { concept: boolean; evidence: boolean; action: boolean }
export type Classification = { signals: Signals; checks: string[]; diagnosis: string; feedback: string; tier: Tier }
export type EvidenceRecord = {
  id: string
  student: StudentId
  answer: string
  feedback: string
  diagnosis: string
  signals: Signals
  checks: string[]
  tier: Tier
  source: 'current_local_session'
  mode: 'rule_baseline'
  createdAt: string
}
const KEY = 'mindtrace-demo-evidence-v1'
export const MAX_ANSWER_LENGTH = 2000
export const prompt = '猫狗分类模型训练准确率 99%，验证准确率 78%。你认为发生了什么？如何确认并改进？'
/** 可测试规则：集中声明，正则与判定分支分离，便于单测与后续替换。 */
export const RULES = {
  concept: /过拟合|overfit/i,
  evidence: /训练|验证|数据|泛化|差距|99|78/,
  action: /增强|正则|早停|交叉验证|更多数据|简化|dropout|检查/i,
} as const
/** 纯函数：把一段回答映射为信号、诊断与反馈，不写存储、不调用外部服务。 */
export function classify(text: string): Classification {
  const signals: Signals = {
    concept: RULES.concept.test(text),
    evidence: RULES.evidence.test(text),
    action: RULES.action.test(text),
  }
  const checks: string[] = []
  if (signals.concept) checks.push('concept:命中过拟合术语')
  if (signals.evidence) checks.push('evidence:命中训练/验证或数值线索')
  if (signals.action) checks.push('action:命中可检验干预')
  const diagnosis = signals.concept
    ? '已识别过拟合概念'
    : signals.evidence
      ? '已注意到训练与验证的差距'
      : '尚未指出训练与验证差距'
  const feedback =
    signals.concept && signals.action
      ? '你指出了过拟合并提出改进方向。下一步请说明如何用独立验证集比较干预前后表现。'
      : signals.concept
        ? '你识别了过拟合。请再提出至少一项可检验的干预，并说明验证方式。'
        : signals.evidence
          ? '你观察到了表现差异。试着用“过拟合”和“泛化”解释这两个数字，再提出验证办法。'
          : '先比较训练 99% 与验证 78%：模型在未见数据上表现如何？请说明可能原因。'
  return { signals, checks, diagnosis, feedback, tier: 'rule_inferred' }
}
export function analyse(student: StudentId, answer: string): EvidenceRecord {
  const text = answer.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
  if (!text) throw new Error('请先填写回答')
  if (text.length > MAX_ANSWER_LENGTH) throw new Error(`回答过长（上限 ${MAX_ANSWER_LENGTH} 字），请精简后提交`)
  const result = classify(text)
  return {
    id: crypto.randomUUID(),
    student,
    answer: text,
    feedback: result.feedback,
    diagnosis: result.diagnosis,
    signals: result.signals,
    checks: result.checks,
    tier: result.tier,
    source: 'current_local_session',
    mode: 'rule_baseline',
    createdAt: new Date().toISOString(),
  }
}
export function getEvidence(): EvidenceRecord[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as EvidenceRecord[] } catch { return [] } }
export function saveEvidence(record: EvidenceRecord) { localStorage.setItem(KEY, JSON.stringify([record, ...getEvidence()].slice(0, 100))) }
export function clearEvidence() { localStorage.removeItem(KEY) }
