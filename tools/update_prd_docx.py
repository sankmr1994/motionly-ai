from copy import deepcopy
from pathlib import Path

from docx import Document


SOURCE = Path(r"docs\Motionly_AI_Approved_PRD_v1_2_Fresh_Copy.docx")
OUTPUT = Path(r"docs\Motionly_AI_PRD_v1_3_Review_Copy.docx")


def replace_paragraph(paragraph, text):
    if paragraph.runs:
        first = paragraph.runs[0]
        first.text = text
        for run in paragraph.runs[1:]:
            run._element.getparent().remove(run._element)
    else:
        paragraph.add_run(text)


def find_paragraph(doc, exact):
    matches = [paragraph for paragraph in doc.paragraphs if paragraph.text == exact]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph match, found {len(matches)}: {exact}")
    return matches[0]


def find_paragraph_starting(doc, prefix):
    matches = [paragraph for paragraph in doc.paragraphs if paragraph.text.startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph prefix match, found {len(matches)}: {prefix}")
    return matches[0]


def find_paragraph_containing(doc, text):
    matches = [paragraph for paragraph in doc.paragraphs if text in paragraph.text]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph text match, found {len(matches)}: {text}")
    return matches[0]


def insert_after(paragraph, text, style=None):
    clone = deepcopy(paragraph._p)
    for child in list(clone):
        if child.tag.endswith("}r") or child.tag.endswith("}hyperlink"):
            clone.remove(child)
    paragraph._p.addnext(clone)
    inserted = paragraph._parent.add_paragraph()
    inserted._p.getparent().remove(inserted._p)
    inserted._p = clone
    inserted._element = clone
    if style is not None:
        inserted.style = style
    replace_paragraph(inserted, text)
    return inserted


doc = Document(SOURCE)

paragraph_replacements = {
    "PRD v1.2  |  Updated draft for final approval  |  05 November 2026":
        "PRD v1.3  |  Instagram publishing amendment for approval  |  10 November 2026",
    "Decision status: Recent product-vision, dual-input, authentication, orchestration and rendering decisions incorporated. Awaiting explicit PRD approval; no system architecture or implementation authorized.":
        "Decision status: PRD v1.2 was approved on 09 November 2026. This v1.3 amendment adds manual and recurring automatic Instagram publishing and is awaiting product-owner approval before implementation.",
    "User approval before publishing; connect one eligible Instagram Professional account initially.":
        "Manual publishing requires explicit approval of the completed video; connect one eligible Instagram Professional account initially.",
    "Scheduled publishing, cancellation of unpublished schedules, token expiry handling, and publish status feedback.":
        "Recurring schedules support REQUIRE_REVIEW and AUTO_PUBLISH modes. Activating AUTO_PUBLISH requires explicit schedule-level confirmation showing the account, content brief, frequency and local publication time.",
    "Voice cloning, multilingual narration, team collaboration, and fully autonomous publishing.":
        "Voice cloning, multilingual narration, team collaboration, and unbounded autonomous publishing outside a user-authorized schedule and its quality gates.",
    "Next document after approval: Motionly AI System Design & Architecture (SDA v1.0)":
        "Next action after approval: begin the implementation sequence defined by the approved system, API, database and Instagram integration designs.",
    "Out of scope V1: news/sports/marketing generators, general-purpose editing timeline, 3D/avatars, multilingual output, billing and fully autonomous publishing.":
        "Out of scope V1: news/sports/marketing generators, general-purpose editing timeline, 3D/avatars, multilingual output, billing, and autonomous publishing that is not constrained by an explicitly authorized schedule and quality gates.",
}

for old, new in paragraph_replacements.items():
    replace_paragraph(find_paragraph(doc, old), new)

replace_paragraph(
    find_paragraph_starting(doc, "Current status: PRD v1.2 DRAFT"),
    "Current status: PRD v1.3 amendment awaiting explicit product-owner approval. The system, architecture, API, database and Instagram integration designs are prepared; implementation remains pending approval.",
)

summary = find_paragraph(
    doc,
    "Motionly AI is a general-purpose AI-powered video creation platform that transforms user topics, ideas, and scripts into videos with coordinated visuals, narration, captions and storytelling. V1 deliberately focuses on English-language educational explainer videos using 2D motion graphics. Future releases may add news, sports, storytelling, marketing and other categories; these are not V1 commitments.",
)
insert_after(
    summary,
    "After a video is generated, Motionly supports two Instagram paths: the user can review and manually publish an approved video, or explicitly activate a recurring schedule that selects a fresh topic, generates a video and publishes it automatically after required quality and safety checks.",
    summary.style,
)

schedule_requirement = find_paragraph(
    doc,
    "Recurring schedules support REQUIRE_REVIEW and AUTO_PUBLISH modes. Activating AUTO_PUBLISH requires explicit schedule-level confirmation showing the account, content brief, frequency and local publication time.",
)
added = insert_after(
    schedule_requirement,
    "Scheduled publishing includes one-time and recurring schedules, timezone-aware execution, pause and cancellation, token-expiry handling, duplicate prevention, retries, notifications and publish-status history.",
    schedule_requirement.style,
)
insert_after(
    added,
    "Automatic runs select a fresh topic within the user's content brief and publish only after content, factual, media-compatibility and connection-health gates pass. Any uncertain gate moves the run to review instead of publishing.",
    schedule_requirement.style,
)

confirmed = find_paragraph_containing(doc, "Retain generated media until user deletion")
proposed = insert_after(
    confirmed,
    "PROPOSED FOR v1.3 APPROVAL - Manual Instagram publishing requires approval of the selected completed video.",
    confirmed.style,
)
insert_after(
    proposed,
    "PROPOSED FOR v1.3 APPROVAL - A recurring schedule may use REQUIRE_REVIEW or AUTO_PUBLISH. Automatic publishing is authorized only for runs created by that schedule and stops when the schedule is paused, the account is disconnected or any quality gate is uncertain.",
    confirmed.style,
)

table_replacements = {
    "After approval, generate English voiceover, synchronized 2D visuals and captions; render vertical MP4. User previews/downloads, and may explicitly publish or schedule to an eligible Instagram Professional account. No automatic posting without approval.":
        "After approval, generate English voiceover, synchronized 2D visuals and captions; render vertical MP4. The user can preview or download, publish immediately, schedule that approved video once, or explicitly activate a recurring content schedule for automatic generation and publishing to an eligible Instagram Professional account.",
    "Approved for V1: Meta Instagram API; not part of initial G1 render proof.":
        "Approved for V1: Meta Instagram API for eligible Professional accounts, supporting manual publication, one-time scheduling and explicitly authorized recurring automatic publication; not part of the initial G1 render proof.",
    "Begin Meta app / account eligibility investigation early; retain MP4 download as fallback.":
        "Begin Meta app review and account-eligibility work early; monitor connection health and account-specific limits; pause affected schedules and retain MP4 download as fallback.",
}

found = {key: 0 for key in table_replacements}
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                if paragraph.text in table_replacements:
                    old = paragraph.text
                    replace_paragraph(paragraph, table_replacements[old])
                    found[old] += 1

for old, count in found.items():
    if count != 1:
        raise RuntimeError(f"Expected one table match, found {count}: {old}")

risk_table = doc.tables[6]
new_row = risk_table.add_row()
new_row.cells[0].text = "Accidental or duplicate automatic publication"
new_row.cells[1].text = (
    "Require explicit schedule-level opt-in, quality gates, deterministic run keys, "
    "idempotent publication jobs, provider-state checks and an immediate pause control."
)

# The source review copy contains a legacy replacement glyph where a dash was intended.
for paragraph in doc.paragraphs:
    if "\ufffd" in paragraph.text:
        replace_paragraph(paragraph, paragraph.text.replace("\ufffd", "-"))
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                if "\ufffd" in paragraph.text:
                    replace_paragraph(paragraph, paragraph.text.replace("\ufffd", "-"))

doc.core_properties.title = "Motionly AI Product Requirements Document"
doc.core_properties.subject = "PRD v1.3 Instagram publishing amendment"
doc.save(OUTPUT)
print(OUTPUT)
