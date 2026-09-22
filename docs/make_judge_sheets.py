# 심사위원 종이 채점표(.docx) 생성 스크립트.
#   python docs/make_judge_sheets.py  →  docs/심사위원_채점표.docx
#
# 심사위원은 웹이 아니라 이 종이로 채점한다(0057). 중간발표(9.28)·본선(10.9)
# 각각 [심사 기준 안내 1장 + 팀 목록이 미리 채워진 채점표]로 구성되며,
# 운영진은 회수한 채점표의 팀별 평균(90점 만점)을 /admin/midterm · /admin/scoring 에 적는다.
#
# 팀 목록은 .env.local 의 서비스 키로 DB(teams, 기권 제외, 이름순)에서 읽는다.
# 읽지 못하면(오프라인 등) 빈 줄 40개로 만든다. 심사표 문구는 src/lib/types.ts 의
# FINAL_CRITERIA·MID_CRITERIA 와 같은 내용을 여기 직접 적는다 — 배점·항목이
# 바뀌면 여기와 DB(criteria) 둘 다 고칠 것.

import json
import sys
import urllib.request
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
NAVY = RGBColor(0x1F, 0x2A, 0x5C)
MUTED = RGBColor(0x66, 0x66, 0x66)
BLANK_ROWS = 40

# (항목, 배점, 설명, 심사위원 채점 여부)
MID = [
    ("논리의 연결성", 30, "문제 정의 → 해결 방안 → 기대 효과가 빈틈없이 이어지는지", True),
    ("실현 & 상용화 가능성", 20, "실제 환경에서 구현·활용될 수 있는지, 서비스·제품으로 발전할 가능성", True),
    ("기획 문서의 재현 가능성", 20, "기획 문서만 보고도 같은 결과물을 만들 수 있을 만큼 구체적인지", True),
    ("창의성 & 차별성", 20, "기존 서비스·해결방안 대비 독창성과 차별화된 특징", True),
    ("발표", 10, "운영진이 반영 — 채점표에 없습니다", False),
]
FINAL = [
    ("실현 & 상용화 가능성", 30, "실제 환경에서 구현·활용될 수 있는지, 서비스·제품으로 발전할 가능성", True),
    ("구현 완성도 & 기술력", 20, "핵심 기능의 실제 구현 여부와 활용 기술의 적절성·완성도", True),
    ("지역 문제 적합성", 20, "지역사회 문제를 정확히 파악하고 그에 맞는 해결 방안을 제시했는지", True),
    ("창의성 & 차별성", 20, "기존 서비스·해결방안 대비 독창성과 차별화된 특징", True),
    ("발표", 5, "운영진이 반영 — 채점표에 없습니다", False),
    ("참여도", 5, "운영진이 반영 — 개회식·최종발표 불참 시 인당 1점 감점", False),
]


# ---------- 팀 목록 ----------
def load_env():
    env = {}
    p = ROOT / ".env.local"
    if not p.exists():
        return env
    for line in p.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


def fetch_teams():
    env = load_env()
    url, key = env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    req = urllib.request.Request(
        f"{url}/rest/v1/teams?select=name&status=neq.withdrawn&order=name.asc",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return [t["name"] for t in json.load(res)]
    except Exception as e:  # noqa: BLE001 — 실패해도 빈 표로 만든다
        print("팀 목록을 읽지 못해 빈 줄로 만듭니다:", e, file=sys.stderr)
        return None


# ---------- docx 도우미 ----------
def set_cell_bg(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    tr_pr.append(el)


def no_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit")
    el.set(qn("w:val"), "true")
    tr_pr.append(el)


def row_height(row, cm):
    tr_pr = row._tr.get_or_add_trPr()
    h = OxmlElement("w:trHeight")
    h.set(qn("w:val"), str(int(cm * 567)))
    h.set(qn("w:hRule"), "atLeast")
    tr_pr.append(h)


def base_font(doc):
    style = doc.styles["Normal"]
    style.font.name = "맑은 고딕"
    style.element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")
    style.font.size = Pt(10.5)
    style.paragraph_format.space_after = Pt(4)
    for name in ("Heading 1", "Heading 2", "Title"):
        st = doc.styles[name]
        st.font.name = "맑은 고딕"
        st.element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")
        st.font.color.rgb = NAVY


def landscape(section):
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = Cm(29.7), Cm(21.0)
    section.left_margin = section.right_margin = Cm(1.5)
    section.top_margin = section.bottom_margin = Cm(1.3)


def cell_text(cell, text, bold=False, size=None, color=None, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    if align:
        p.alignment = align
    r = p.add_run(text)
    r.bold = bold
    if size:
        r.font.size = Pt(size)
    if color:
        r.font.color.rgb = color
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    return r


def bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
    p.add_run(text)
    return p


def signature_line(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("심사위원 성명: ______________________    서명: ______________")
    r.font.size = Pt(11)


# ---------- 1장: 심사 기준 안내 ----------
def criteria_table(doc, rows):
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell, text in zip(table.rows[0].cells, ("항목", "배점", "설명")):
        cell_text(cell, text, bold=True)
        set_cell_bg(cell, "E8ECF5")
    for name, pts, desc, by_judge in rows:
        c = table.add_row().cells
        cell_text(c[0], name, bold=by_judge)
        cell_text(c[1], str(pts), align=WD_ALIGN_PARAGRAPH.CENTER)
        cell_text(c[2], desc)
        if not by_judge:
            for cell in c:
                set_cell_bg(cell, "F5F5F5")
                for p in cell.paragraphs:
                    for r in p.runs:
                        r.font.color.rgb = MUTED
    widths = (Cm(5.0), Cm(1.6), Cm(19.0))
    for row in table.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = w


def guide_page(doc, title, when, intro, rows, notes):
    doc.add_heading("월계1동 지역문제 해결 해커톤", level=1)
    h = doc.add_heading(f"{title} 심사위원 안내  ·  {when}", level=2)
    h.paragraph_format.space_before = Pt(0)
    doc.add_paragraph(intro)
    criteria_table(doc, rows)
    judge_items = [r for r in rows if r[3]]
    judge_total = sum(p for _, p, _, _ in judge_items)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    r = p.add_run(
        f"합계 100점. 심사위원께서는 회색 칸을 뺀 {len(judge_items)}개 항목, "
        f"{judge_total}점 만점으로 채점해 주세요. 발표·참여도는 운영진이 별도로 반영합니다."
    )
    r.bold = True
    doc.add_heading("채점 요령", level=2)
    for text, prefix in notes:
        bullet(doc, text, prefix)
    signature_line(doc)


# ---------- 채점표 ----------
def score_sheet(doc, title, when, rows, teams):
    crits = [(n, p) for n, p, _, j in rows if j]
    judge_total = sum(p for _, p in crits)

    h = doc.add_heading(f"{title} 채점표  ·  {when}", level=2)
    h.paragraph_format.space_before = Pt(0)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(
        f"항목마다 0점부터 배점까지 1점 단위 정수로 적고, 합계({judge_total}점 만점)를 계산해 주세요. "
        "비고에는 팀에 남길 말이나 특이사항을 적어 주세요(선택)."
    )
    r.font.size = Pt(9.5)
    r.font.color.rgb = MUTED
    signature_line(doc)

    cols = ["No", "팀"] + [f"{n}\n({p})" for n, p in crits] + [f"합계\n({judge_total})", "비고"]
    table = doc.add_table(rows=1, cols=len(cols))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0]
    repeat_header(hdr)
    for cell, text in zip(hdr.cells, cols):
        cell_text(cell, text, bold=True, size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_bg(cell, "E8ECF5")
    set_cell_bg(hdr.cells[-2], "FFF4D6")  # 합계 칸은 눈에 띄게

    names = teams if teams else [""] * BLANK_ROWS
    for i, name in enumerate(names, 1):
        row = table.add_row()
        no_split(row)
        row_height(row, 0.85)
        c = row.cells
        cell_text(c[0], str(i), size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        cell_text(c[1], name, size=10)
        for cell in c[2:]:
            cell_text(cell, "", size=10)

    # 가로 26.7cm: No 1.0 · 팀 5.2 · 항목 4×3.0 · 합계 2.2 · 비고 나머지
    rest = 26.7 - 1.0 - 5.2 - 3.0 * len(crits) - 2.2
    widths = [Cm(1.0), Cm(5.2)] + [Cm(3.0)] * len(crits) + [Cm(2.2), Cm(rest)]
    for row in table.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = w


def page_break(doc):
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def main():
    teams = fetch_teams()
    doc = Document()
    base_font(doc)
    landscape(doc.sections[0])

    common_notes = [
        ("같은 항목이라도 팀 간 상대 비교를 염두에 두고 일관되게 매겨 주시면 집계가 공정해집니다.", "일관성 — "),
        ("발표 시간 준수·출석 같은 운영 요소는 운영진이 반영하므로 내용만 봐 주시면 됩니다.", "내용만 — "),
        ("점수와 순위는 대회가 끝날 때까지 비공개입니다. 채점표는 발표가 끝난 뒤 운영진이 회수합니다.", "비공개 — "),
        ("여러 심사위원의 점수는 팀별로 평균해 반영됩니다. 채점표에 성명·서명을 꼭 적어 주세요.", "합산 — "),
    ]

    # ---- 중간발표 ----
    guide_page(
        doc,
        "중간발표",
        "9.28(일) 18:30 · 80주년기념관 310호",
        "기획·아이디어 단계 발표입니다. 아래 4개 항목(90점)을 심사위원이 채점하고, "
        "발표 10점은 운영진이 반영해 합계 100점이 됩니다. 합산 1위 팀이 매니패스트상을 받습니다.",
        MID,
        [("중간발표 점수는 본선 점수에 합산되지 않습니다. 부담 없이 기획의 완성도로 평가해 주세요.", "본선과 별개 — ")]
        + common_notes,
    )
    page_break(doc)
    score_sheet(doc, "중간발표", "9.28", MID, teams)
    page_break(doc)

    # ---- 본선 ----
    guide_page(
        doc,
        "본선 최종발표",
        "10.9(목) 09:00 · 80주년기념관",
        "무박 2일 개발을 마친 결과물 발표입니다(팀당 5분 + 질의응답). 아래 4개 항목(90점)을 심사위원이 채점하고, "
        "발표 5점·참여도 5점은 운영진이 반영해 합계 100점이 됩니다.",
        FINAL,
        [
            ("심사위원 점수 : 참가 팀 상호평가 = 2 : 1 로 합산해 상위 15팀을 전시 진출팀으로 뽑습니다.", "1차 선정 — "),
            ("진출팀은 전시 기간(10.11–10.13) 주민투표 점수를 더합니다. 심사 50% · 상호평가 25% · 주민투표 25%. "
             "합산 1위 노원구청장상, 2~4위 광운대학교 총장상.", "최종 순위 — "),
        ]
        + common_notes,
    )
    page_break(doc)
    score_sheet(doc, "본선 최종발표", "10.9", FINAL, teams)

    out = ROOT / "docs" / "심사위원_채점표.docx"
    doc.save(out)
    print(out, f"(팀 {len(teams) if teams else 0}개, 빈 줄이면 {BLANK_ROWS})")


if __name__ == "__main__":
    main()
