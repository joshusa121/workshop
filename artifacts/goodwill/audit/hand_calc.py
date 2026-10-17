"""2화 영업권 계산기 Phase 3 감사 — 독립 손계산 (엔진 코드 미사용, 분수 정확 연산).
근거: 상증령 §56①·§59②, 상증규칙 §16②·§19①, 소득세법 §55①·§129①6호라·§14③8호가·§50①1호,
소득세법 영 §87 1의2호, 법인세법 §55①1호, 법인세법 영 §26①1호·규칙 별표3, 지방세법 §92①·§103의20①(국세 산출 × 10%).
단수: 평가액·상각비·기타소득금액 원 미만 버림, 세액 10원 미만 버림, 지방 = 국세 산출 × 10% 후 10원 버림.
"""
from fractions import Fraction as F
import json, math

def fl(x):  # 원 미만 버림 (음수는 0)
    return max(0, math.floor(x))
def fl10(x):
    return max(0, math.floor(F(x) / 10) * 10)

ITAX = [(14_000_000, F(6,100)), (50_000_000, F(15,100)), (88_000_000, F(24,100)), (150_000_000, F(35,100)),
        (300_000_000, F(38,100)), (500_000_000, F(40,100)), (1_000_000_000, F(42,100)), (None, F(45,100))]
CTAX = [(200_000_000, F(10,100)), (20_000_000_000, F(20,100)), (300_000_000_000, F(22,100)), (None, F(25,100))]

def prog(base, table):
    tax, lo = F(0), 0
    for up, r in table:
        top = base if up is None else min(base, up)
        if top > lo: tax += (top - lo) * r
        if up is None or base <= up: break
        lo = up
    return tax

def income_total(base):
    b = fl(base); t = fl10(prog(b, ITAX)); return t + fl10(F(t) / 10)
def corp_total(base):
    b = fl(base); t = fl10(prog(b, CTAX)); return t + fl10(F(t) / 10)

def run(n1, n2, n3, equity, other, corp_base):
    avg = max(F(0), F(n1*3 + n2*2 + n3*1, 6))
    excess = max(F(0), avg / 2 - F(equity) / 10)
    pv = sum(excess / F(11,10)**n for n in range(1, 6))
    gw = fl(pv)
    amount = fl(F(gw) - F(gw) * F(6,10))
    wn = fl10(F(amount) * F(2,10)); wl = fl10(F(wn) / 10); wh = wn + wl
    ded = 1_500_000
    extra = income_total(other + amount - ded) - income_total(other - ded)
    sep = 0 < amount <= 3_000_000
    personal = min(extra, wh) if sep else extra
    amort = fl(F(gw) / 5)
    saving = corp_total(corp_base) - corp_total(corp_base - amort)
    return dict(weightedAvg=float(avg), excess=float(excess), goodwill=gw, otherIncomeAmount=amount,
                withholding=wh, comprehensiveExtra=extra, separateEligible=sep, personalTax=personal,
                settlement=personal - wh, amort=amort, annualSaving=saving, fiveYear=saving*5,
                net=saving*5 - personal)

CASES = {
    "A1 순손익 감소 3억/2억/1억·자기자본 1억·타소득 0·법인 과표 3억": (300_000_000, 200_000_000, 100_000_000, 100_000_000, 0, 300_000_000),
    "A2a 소액(분리과세 유리)·타소득 8천만": (10_000_000, 10_000_000, 10_000_000, 31_000_000, 80_000_000, 100_000_000),
    "A2b 소액(종합과세 유리)·타소득 0": (10_000_000, 10_000_000, 10_000_000, 31_000_000, 0, 100_000_000),
    "A3 법인 과표 200억 경계(20%→22%)": (3_000_000_000, 2_800_000_000, 2_600_000_000, 1_000_000_000, 0, 20_500_000_000),
}
if __name__ == "__main__":
    out = {k: run(*v) for k, v in CASES.items()}
    # 300만원 경계 ±1원: 양도대가 7,500,000 → 금액 3,000,000 / 7,500,003 → 3,000,001
    for gw in (7_500_000, 7_500_003):
        amount = fl(F(gw) * F(4,10)); wn = fl10(F(amount)/5); wh = wn + fl10(F(wn)/10)
        extra = income_total(80_000_000 + amount - 1_500_000) - income_total(80_000_000 - 1_500_000)
        sep = 0 < amount <= 3_000_000
        out[f"B 300만 경계 양도대가 {gw:,}·타소득 8천만"] = dict(otherIncomeAmount=amount, withholding=wh,
            comprehensiveExtra=extra, separateEligible=sep, personalTax=min(extra, wh) if sep else extra)
    print(json.dumps(out, ensure_ascii=False, indent=1))
