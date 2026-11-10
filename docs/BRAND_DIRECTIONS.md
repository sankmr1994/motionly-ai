# Motionly AI — Brand Direction Exploration

**Status:** Direction selection pending  
**Last reviewed:** 2026-11-09  
**Stitch project:** [Motionly AI Brand Directions](https://stitch.withgoogle.com/projects/11389757405079069511?pli=1)

## 1. Brand idea

Motionly turns difficult ideas into clear, narrated motion. The visual identity should feel like a modern creative studio with technical depth—not a generic AI application or an AI tool marketplace.

**Working headline:** Ideas, taught in motion.  
**Brand character:** precise, imaginative, calm, intelligent, and crafted.  
**Product promise:** Turn any concept into a clear animated video—planned, voiced, captioned, and rendered in one creative workflow.

## 2. Shared design principles

All three directions follow the same foundation:

1. **Show the craft:** Visualize storyboards, diagrams, timelines, narration, and motion—not abstract AI symbolism.
2. **Editorial before ornamental:** Typography, composition, and content hierarchy create the personality.
3. **Restrained vibrancy:** One primary accent and one supporting signal color per view; neutral surfaces carry the interface.
4. **Futuristic through behavior:** Precise motion, responsive diagrams, and meaningful transitions feel more advanced than excessive glow or glass.
5. **Professional clarity:** Product evidence appears early, and every decorative element supports the story.
6. **Human language:** Avoid hype-heavy AI vocabulary. Describe the creative outcome and workflow.

Avoid robot heads, magic-wand icons, stock 3D blobs, rainbow gradients, excessive glassmorphism, neon cyberpunk treatments, and repetitive card walls.

## 3. Direction comparison

| Direction             | Best quality                   | Visual character            | Recommended audience impression                           |
| --------------------- | ------------------------------ | --------------------------- | --------------------------------------------------------- |
| **01 Midnight Prism** | Strongest creative identity    | Dark, cinematic, precise    | A serious motion-design studio with powerful technology   |
| **02 Signal Paper**   | Most editorial and distinctive | Warm, technical, asymmetric | A modern publishing system for visual knowledge           |
| **03 Aurora Field**   | Most approachable and scalable | Calm, luminous, optimistic  | An intelligent creative platform that feels easy to enter |

## 4. Direction 01 — Midnight Prism

### Personality

Cinematic, authoritative, disciplined, and precise. This is the boldest direction and makes the product itself feel like a professional motion studio.

### Color system

| Token       | Value     | Use                                            |
| ----------- | --------- | ---------------------------------------------- |
| Ink         | `#090B13` | Primary page background                        |
| Slate       | `#121725` | Raised surfaces and panels                     |
| Cloud       | `#F4F6FB` | Primary text                                   |
| Periwinkle  | `#7C6CF2` | Primary actions and selected states            |
| Cyan        | `#42D6C8` | Timeline, success, and synchronization signals |
| Cool border | `#2E3342` | Hairlines and panel boundaries                 |

Accent colors should cover less than 15% of a typical screen.

### Typography

- Display: **Space Grotesk**, 600–700 weight.
- UI and body: **Inter**, 400–600 weight.
- Technical metadata: Inter or a restrained monospace face at small sizes.

### Signature visual

An elegant horizontal storyboard and production timeline where flat vector diagrams transform into finished video frames.

### Risks

- Can feel too developer-focused if metadata overwhelms the story.
- Needs careful contrast and generous spacing to avoid becoming visually dense.

## 5. Direction 02 — Signal Paper

### Personality

Creative director's desk meets a modern editorial press. It is deliberately less “software-like” and emphasizes ideas, sequencing, and authorship.

### Color system

| Token       | Value     | Use                                 |
| ----------- | --------- | ----------------------------------- |
| Warm canvas | `#F6F2EA` | Primary page background             |
| Carbon      | `#171717` | Primary text and keylines           |
| Paper white | `#FFFDFC` | Raised panels                       |
| Vermilion   | `#F05A47` | Primary signal and motion path      |
| Deep violet | `#5D4AE8` | Secondary action and selected state |
| Muted ink   | `#68635C` | Secondary copy                      |

### Typography

- Display: **Sora**, 600–700 weight.
- UI and body: **Manrope**, 400–600 weight.
- Labels: compact monospace text for frame numbers and technical notes.

### Signature visual

A storyboard contact sheet connected by one continuous vermilion motion path, using director marks and timing annotations.

### Risks

- Strong keylines can feel harsh if every component receives equal emphasis.
- The editorial style must remain warm and light; converting it to dark surfaces makes it too similar to Midnight Prism.

## 6. Direction 03 — Aurora Field

### Personality

Intelligent, optimistic, calm, and spacious. This direction balances futuristic product expression with broad professional appeal.

### Color system

| Token        | Value     | Use                                 |
| ------------ | --------- | ----------------------------------- |
| Deep indigo  | `#10132B` | Hero and high-focus surfaces        |
| Mist         | `#EEF1F8` | Light page surfaces                 |
| Lavender     | `#A89AF5` | Primary action and knowledge nodes  |
| Mineral mint | `#68D6BE` | Progress and successful connections |
| Coral        | `#FF8066` | Sparse emphasis and alerts          |
| White        | `#FFFFFF` | Elevated content surfaces           |

### Typography

- Display: **Plus Jakarta Sans**, 600–700 weight.
- UI and body: **Inter**, 400–600 weight.

### Signature visual

An explorable concept map that flows into a polished video player, making the transformation from knowledge to motion visible.

### Risks

- Soft colors and rounded geometry can become generic unless orbital guides and the concept-to-video visual remain distinctive.
- Gradients should stay inside hero/product media, not cover entire sections.

## 7. Shared foundation

### Layout

- 8px base spacing grid.
- Desktop content maximum: 1280px within a 1440px reference canvas.
- Mobile side padding: 20px; tablet: 32px; desktop: 48–80px.
- Section spacing: 96–144px desktop and 64–88px mobile.
- Use asymmetric compositions for marketing pages and stricter grids inside the application.

### Shape and elevation

- Small controls: 8–10px radius.
- Cards and panels: 12–20px radius.
- Hero media: 20–28px radius where appropriate.
- Prefer borders, tonal separation, and local contrast over large shadows.
- Avoid making every container a floating card.

### Interaction and motion

- Micro-interactions: 120–180ms.
- Standard transitions: 220–320ms.
- Narrative or diagram transitions: 450–700ms.
- Use ease-out for entry and ease-in-out for spatial rearrangement.
- Caption and text transitions must preserve font size and container geometry; use opacity and small vertical movement instead of scale pulsing.
- Respect `prefers-reduced-motion` and provide a stable non-animated state.

### Accessibility

- WCAG AA contrast for all body text and controls.
- Minimum 16px body copy.
- Minimum 44×44px interactive target.
- Visible keyboard focus using the direction's primary accent.
- Never communicate state through color alone.
- Captions remain readable over all video imagery with a stable background treatment.

## 8. Homepage comparison structure

Each Stitch concept uses the same structure:

1. Compact header and primary creation action.
2. “Ideas, taught in motion.” hero with a product-story visualization.
3. Describe → Direct → Publish workflow.
4. Solar System, Compound Interest, and Binary Search examples.
5. Reusable motion-template showcase.
6. Quality and trust section.
7. Focused final creation CTA.

Pricing is intentionally absent because billing is outside V1.

## 9. Selection criteria

Score each direction from 1–5 on:

- Distinctiveness without relying on AI clichés.
- Immediate understanding of the product.
- Professional credibility.
- Emotional appeal and memorability.
- Ability to scale from homepage to the creation workspace.
- Readability and accessibility.
- Ability to support both educational and business topics.

After selecting a direction, the next deliverable is the definitive V1 brand guideline: finalized tokens, type scale, component states, icon and illustration rules, responsive behavior, motion language, and homepage specification.

## 10. Light-theme exploration round

The first Stitch generation applied its shared dark foundation too strongly, including to concepts originally intended to be lighter. The next comparison round must preserve the original screens and add three genuinely light alternatives. At least 80% of each new page should use a white, cream, or pale-tinted surface; dark colors are limited to text, borders, and contained product media.

### 04 Porcelain Cobalt

- Canvas: `#FCFCFA`; alternate surface: `#F1F4F8`.
- Ink: `#152238`; primary: `#3157E7`.
- Supporting colors: `#B7E45B` and `#A9D7FF`.
- Type: Instrument Sans with Geist or Inter.
- Character: crisp, intelligent, energetic, and premium.
- Signature: a cobalt storyboard rail moving from idea cards to vector frames and a bright video player.

### 05 Mint Coral Studio

- Canvas: `#F7FBF7`; alternate surface: `#E4F3EA`.
- Ink: `#17362C`; primary: `#F26B5E`.
- Supporting color: `#4E5BD5`; panels: `#FFFFFF`.
- Type: Manrope with Inter.
- Character: optimistic, approachable, crafted, and professional.
- Signature: an airy concept map flowing into a light video preview.

### 06 Apricot Violet Editorial

- Canvas: `#FFF8EE`; paper: `#FFFFFF`.
- Ink: `#30213D`; primary: `#6C4BEF`.
- Supporting colors: `#FFB36B` and `#F47D91`.
- Type: Sora with Source Sans 3.
- Character: expressive, cultured, confident, and contemporary.
- Signature: a staggered storyboard contact sheet connected by one violet motion path.
