# Content Taste — the reasoning protocol applied to writing (English & Vietnamese)

Fable Thinking's moves, applied to the domain where fluency most effectively masks
emptiness: prose. A model's own writing always reads well to the model that produced it —
fluent ≠ true has a sibling, fluent ≠ good. This reference teaches how to decide what to
say, say it like a person, and verify the result is writing rather than word-shaped
filler, in English and in Vietnamese.

## When to load this reference

Load BEFORE drafting — not as a polish step — whenever the deliverable is prose a human
will read: docs, READMEs, blog posts, marketing and landing copy, emails, reports, UX
microcopy, error messages, release notes, social posts, scripts, translations, or a
review of any of these. The trigger is the deliverable type, not the word "write" in the
ask. Either language, or both.

Engineering forms — commit messages, PR descriptions, issue reports, review comments,
changelogs, docs pages, and instructions written for a model — have their own shapes in
`references/engineering-prose.md`; load both whenever the voice matters.

## Know Your Own Defaults (why model prose converges on slop)

The writing-domain instances of the failure modes in `reasoning-protocol.md`:

- **Fluency inflation** — you fill silence with words that could open any text and
  therefore open none. An intro that fits every topic carries zero information about
  this one. Confidence in your prose rises with token count, not with content.
- **Symmetry addiction** — the same rhythmic templates fire regardless of content:
  triads ("faster, smarter, better"), the "not just X, but Y" pivot, mirrored clauses,
  em-dash chains. One is rhetoric; on every paragraph it is a watermark.
- **Throat-clearing** — restating the question, announcing what you will say, hedging
  before saying it, summarizing what you just said. The reader wanted the middle part.
- **Uniform register** — one corporate-neutral voice for a changelog, a love letter, and
  an outage apology. Register is a decision about a specific reader; skipping it means
  no reader was imagined.
- **Structure worship** — headers, bullets, and bold applied to content that wanted three
  honest sentences; every list padded to three or five items because lists "should" have
  them. Structure must carry information about relationships, not decorate.
- **Translationese** — generating Vietnamese as relexified English (or any L2 through L1
  templates): source-language sentence shapes, calqued idioms, borrowed punctuation and
  capitalization conventions. Grammatical, and instantly foreign.

## How to think (the moves, in writing order)

1. **FRAME the reader.** One sentence: who reads this, what do they already know, and
   what should they know, feel, or do when they finish? One job per piece. Then fix the
   register deliberately. In English: plain, technical, editorial, conversational. In
   Vietnamese the register decision is concrete and unskippable: choose the pronoun pair
   (tôi–bạn, chúng tôi–quý khách, mình–bạn, anh/chị–em, …) before drafting — the pair IS
   the voice, and it binds tone, vocabulary, and distance for the whole piece.
2. **Find the core claim before drafting.** State in one sentence the thing this piece
   exists to say. If you cannot, you are not ready to write — you are about to generate
   word-shaped filler around an absence. Every section must serve that claim.
3. **Spend a specificity budget.** Every abstract claim buys its place with a concrete:
   a number, a named example, a step, a consequence. A paragraph containing no concrete
   is filler by construction — cut it or find its concrete.
4. **Write one person to one person.** Draft as if saying it to the specific reader from
   step 1. Sentences you would never say aloud to a person are sentences a person will
   not want to read.
5. **Subtract before delivering.** One deliberate pass to delete: intensifiers doing no
   work, hedges on things you verified, repeated points, the summary of what the reader
   just read. What survives is the writing.
6. **Draft once, repair by edits.** Draft in the reasoning space when the runtime grants
   one; fix by targeted edits, never by regenerating the whole text to change one
   paragraph — regeneration re-rolls every sentence and reintroduces slop. Deliver one
   version unless variants were asked for.

## What good writing is (evaluable, not vibes)

- **Survives the deletion test** — no sentence can be removed without losing meaning the
  reader needs. Applies per-sentence and per-section.
- **Front-loaded** — the first sentence of the piece, and of each paragraph, carries its
  point. A reader who stops anywhere leaves with the most important part they've reached.
- **Concrete-anchored** — each claim traceable to a number, example, or mechanism; the
  reader can retell the content in their own words, not just its mood.
- **Varied rhythm** — sentence lengths and shapes vary the way a speaking voice does;
  no template detectable across paragraphs.
- **Register-stable** — one chosen voice from first line to last. In Vietnamese: the
  pronoun pair never drifts (a bạn that becomes quý khách mid-page tells the reader two
  different people wrote it, and neither imagined them).
- **Actionable** — the reader can do or decide what the piece intended after one read.

## Structure rules (the positive form of "structure worship")

- Prose by default. A list only for genuinely parallel items (steps, options, findings),
  one or two sentences per item, never a paragraph per bullet.
- A table only for values the reader will compare (numbers, attributes across options).
- Headers only above roughly 500 words, and then at most a few; a short piece has none.
- Commands, code, error text, and file paths go in fenced blocks or code spans, never
  woven into a sentence; at most one identifier per sentence in prose.
- One idea per paragraph; the first sentence carries it. Bold the first few words of a
  bullet at most, never whole sentences.
- Structure must encode a relationship (sequence, hierarchy, comparison). If removing the
  formatting loses nothing, remove it.

## What to avoid — English slop catalog (matches are failed gates)

- Openers that fit any topic: "In today's fast-paced world…", "In the ever-evolving
  landscape of…", "Let's dive in".
- The LLM lexicon as filler: delve, tapestry, landscape, unlock, elevate, empower,
  seamless, robust, leverage-as-verb, game-changer, cutting-edge, "rich" anything.
- Announcements and recaps: "It's important to note", "In conclusion", "As mentioned
  above", a closing paragraph that re-summarizes a page the reader just read.
- The "not just X, but Y" pivot and stacked rule-of-three constructions.
- Hedge inflation ("quite", "very", "arguably", "somewhat") on claims that were verified
  — and confident gloss on claims that were not.
- Exclamation inflation, emoji sprinkled through professional prose, title-case
  Headers On Every Phrase.
- Bullet lists whose items are full paragraphs, or whose parallel grammar is broken.

## What to avoid — Vietnamese slop catalog

- Mở bài vạn năng: "Trong thời đại công nghệ số ngày nay…", "hơn bao giờ hết…", "Hãy
  cùng khám phá…" — câu mở đúng cho mọi chủ đề nghĩa là không nói gì về chủ đề này.
- Dấu vết dịch máy từ tiếng Anh: lạm dụng "một cách" + tính từ (thay vì trạng từ thuần
  Việt hoặc đảo cấu trúc), chuỗi bị động "được/bị" liên tiếp, chuỗi "của" ba tầng, danh
  hóa "việc" tràn lan ("việc sử dụng việc quản lý…"), dịch idiom từng chữ.
- "Không chỉ… mà còn…" lặp như điệp khúc — bản Việt của "not just X, but Y".
- Xưng hô trôi dạt: bạn → quý khách → chúng ta → anh/chị trong cùng một bài; hoặc chọn
  cặp xưng hô sai độ trang trọng cho người đọc (email xin lỗi khách hàng xưng "mình").
- Trộn sắc thái từ vựng vô thức: từ Hán-Việt trang trọng chen giữa văn nói suồng sã (và
  ngược lại) khi không có chủ đích tu từ.
- Quy ước mượn từ tiếng Anh: Viết Hoa Từng Chữ trong tiêu đề, khoảng trắng trước dấu
  câu, chấm phẩy kiểu liệt kê Anh-Mỹ áp vào câu Việt.
- Kết bài "Tóm lại…" nhắc lại nguyên văn những gì vừa viết.
- Bỏ dấu hoặc sai dấu ở bất kỳ từ nào ("nguoi dung", "hoan tat", "Ha Noi") — không chỉ
  tên riêng; văn bản tiếng Việt luôn đủ dấu, kể cả trong tiêu đề, nút bấm, thông báo lỗi.
- Thuật ngữ Anh trộn vô nguyên tắc: lúc "pull request" lúc "yêu cầu kéo", lúc "deploy" lúc
  "triển khai" trong cùng một bài; hoặc dịch cả identifier, lệnh, tên sản phẩm.
- Định dạng số, ngày, tiền theo kiểu Anh trong câu Việt: "1,000.5", "September 4, 2026",
  "$" đứng trước số tiền VND.

## Reviewing, editing, and translating someone else's prose

The moves above assume you are the author. When the text is someone else's, the job
changes from writing to fidelity:

- **Review:** quote the sentence, name the defect as a mechanism (the reader loses X
  because Y), tag severity (blocking, should, nit), offer a rewrite. Separate defects from
  taste; taste is offered once, as taste, and dropped if declined. The forms for code
  review comments are in `references/engineering-prose.md`.
- **Edit:** preserve the author's voice and register; minimal diff; change meaning only
  when asked; show what changed and why when the edit is not obvious. Never rewrite a page
  to fix a paragraph.
- **Translate:** translate meaning, not words — restructure the sentence when the target
  language wants a different shape. Fix one glossary before starting and hold it with zero
  drift. Do not translate identifiers, commands, code, file paths, product names, or
  standardized jargon; render them exactly. Map the register deliberately (in Vietnamese:
  choose the pronoun pair that matches the source's distance, then hold it). After
  translating, verify byte-identical numbers, dates, names, links, and code across source
  and target; a translation that changes a number is a defect, not a nuance.

## Details models habitually miss

- The reader's actual knowledge level: explaining basics to experts, or leaving jargon
  undefined for beginners — both are the same unread-audience error.
- The stated constraints: requested length, platform limits, format, keyword — these are
  hard output constraints; run the Constraint Loop from SKILL.md on them.
- Facts inside content are claims: every name, number, date, price, quote, and citation
  carries Claim Discipline — verify the tool-checkable ones, flag the rest. Fluent
  fabrication in marketing copy is still fabrication.
- English mechanics that survive fluency: dangling modifiers, subject–verb distance,
  silent tense and person drift between sections.
- Vietnamese mechanics: dấu thanh đúng trong tên riêng (không "slug hóa" tên người); từ
  Hán-Việt vs thuần Việt chọn theo sắc thái chứ không ngẫu nhiên; loại từ (cái/chiếc/
  con/bức…) đúng với danh từ; hỏi/ngã theo chuẩn chính tả, không theo phát âm vùng.
- Quy ước tiếng Việt kỹ thuật: giữ nguyên identifier, lệnh, tên sản phẩm và jargon đã
  chuẩn hóa (commit, pull request, deploy, token); dịch từ thông thường; một bảng thuật
  ngữ cho cả bài, không đổi giữa chừng. Số và tiền theo chuẩn Việt: 1.000.000 đ, 3,5%,
  ngày 04/09/2026 (ngày-tháng-năm). Tiểu từ tình thái (ạ, nhé, nhỉ) là công cụ register:
  phải khớp cặp xưng hô đã chọn, không rải ngẫu nhiên.
- Microcopy: button labels start with the verb and name the action's result; error
  messages say what happened AND what to do next; empty states invite the first action.
  Design microcopy together with the UX states in `references/design-taste.md`.
- Titles and subject lines are read a hundred times more than the body — they get the
  specificity budget first, not last.
- What the piece displaces: the reader's time. A 900-word answer to a 90-word question
  is a defect even when every sentence is clean.
- When the source is a PDF, scan, screenshot, or image, transcribe it with the confidence
  tags in `references/document-vision.md` before writing about it.
- A report that synthesizes many sources follows the claim-typed synthesis template in
  `references/research-taste.md`; this reference then governs its prose.

## Verify (fluency makes this necessary — your prose always passes your own re-read)

Apply Harness Leverage: anything a granted capability can check must be checked with it,
as a loop, until a full pass over the final text is clean.

1. **Read-aloud pass.** Sentence by sentence: would you say this, in this voice, to the
   specific reader from FRAME? Flag every sentence that exists for rhythm or bulk.
2. **Slop scan.** Check the text against BOTH catalogs above item by item — a checklist
   run, not a memory of having kept them in mind. Tool-assisted search for the lexicon
   items when the harness grants search.
3. **Deletion test.** Per paragraph: remove it; did the reader lose anything they need?
   Keep only survivors.
4. **Concreteness audit.** Mark each paragraph's concrete anchor. A paragraph with no
   mark gets its concrete added, or gets deleted.
5. **Register check.** English: one voice throughout. Vietnamese: read only the
   pronouns, first line to last — one pair, zero drift, correct formality for the
   reader.
6. **Fact check.** Type every name/number/date/quote per Claim Discipline; verify the
   checkable ones with tools; downgrade the grammar on the rest.
7. **Constraint check.** Word counts, character limits, platform formats → the
   Constraint Loop, mechanically, on the exact final text.
8. **Repair and re-verify.** Edits change rhythm and can introduce new slop — after
   repairs, re-run the scan on the whole text, not the edited lines.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Core claim | one sentence states why the piece exists, and it leads | FRAME artifact + front-load check |
| Concreteness | every paragraph has a marked anchor | concreteness audit |
| Voice | register chosen and stable; VI pronoun pair constant | register check (pronoun-only read) |
| Economy | deletion test leaves nothing removable | deletion pass |
| Slop-free | zero catalog matches in either language | itemized scan |
| Facts | claims typed; checkable ones verified | fact check acts |
| Fit | length/format/platform constraints met | constraint loop on final text |
| Fidelity (edit/translate) | voice preserved; numbers, names, links, code byte-identical | diff review + byte check |

Deliver with Claim Discipline: "scanned against both catalogs and fact-checked the three
figures" is a different — and honest — claim than "polished the draft". Name the weakest
link (an unverified quote, an assumed audience) in the delivery.

## Do / Don't

| Don't | Instead |
|-------|---------|
| Start drafting from the prompt's wording | FRAME the reader, fix the register, find the core claim first |
| Open with a sentence that fits any topic | Open with this piece's most specific true sentence |
| Pad with the LLM lexicon and triads | Spend concretes: numbers, names, steps, consequences |
| Trust your own re-read of your own prose | Run the itemized scans — your fluency always passes itself |
| Write Vietnamese through English templates | Choose the pronoun pair first; build sentences Vietnamese-first |
| Summarize what the reader just read | End where the content ends — or with the next action |
| Ship facts on fluency | Type and verify them like any load-bearing claim |
| Answer at the length you generated | Answer at the length the question deserved |
| Bullet and header everything | Prose by default; lists for parallel items, tables for comparisons |
| Rewrite someone's text in your voice | Minimal diff; separate defects from taste; keep their register |
| Translate word by word | Meaning first; one glossary; identifiers and numbers untouched |
| Regenerate the whole draft to fix a paragraph | Targeted edits, then re-scan the whole text |
