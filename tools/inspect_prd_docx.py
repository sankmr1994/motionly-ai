from docx import Document

path = r"docs\Motionly_AI_PRD_v1_3_Review_Copy.docx"
doc = Document(path)
print("paragraphs", len(doc.paragraphs), "tables", len(doc.tables))

all_text = "\n".join(
    [paragraph.text for paragraph in doc.paragraphs]
    + [cell.text for table in doc.tables for row in table.rows for cell in row.cells]
)
required_terms = (
    "Manual publishing requires explicit approval",
    "REQUIRE_REVIEW and AUTO_PUBLISH",
    "selects a fresh topic",
    "automatic generation and publishing",
    "Accidental or duplicate automatic publication",
)
for term in required_terms:
    print("REQUIRED", term, all_text.count(term))
print("FORBIDDEN no automatic posting", all_text.lower().count("no automatic posting"))
print("FORBIDDEN fully autonomous publishing", all_text.lower().count("fully autonomous publishing"))
for character in sorted(set(all_text)):
    if ord(character) > 127 and character not in "×≤—’“”":
        print("NONSTANDARD", repr(character), hex(ord(character)), all_text.count(character))

paragraph_terms = (
    "PRD v1.2",
    "Decision status",
    "Motionly AI is",
    "User approval before",
    "Scheduled publishing",
    "fully autonomous",
    "Current status",
    "Next document",
    "Out of scope V1",
    "Retain generated media",
)
for index, paragraph in enumerate(doc.paragraphs):
    if any(term in paragraph.text for term in paragraph_terms):
        print("P", index, repr(paragraph.text))

table_terms = ("Generate & Publish", "Instagram", "Accidental", "Voice cloning")
for table_index, table in enumerate(doc.tables):
    for row_index, row in enumerate(table.rows):
        for cell_index, cell in enumerate(row.cells):
            if any(term in cell.text for term in table_terms):
                print("T", table_index, row_index, cell_index, repr(cell.text))
