const workflowSteps = [
  {
    number: "01",
    label: "Describe",
    title: "Start with one clear idea",
    copy: "Write a topic, paste a script, or explain what your audience should understand. Motionly turns it into a simple scene plan.",
  },
  {
    number: "02",
    label: "Direct",
    title: "Review before anything renders",
    copy: "Check the story, narration, visuals, voice, and captions. Every scene stays editable until it feels right.",
  },
  {
    number: "03",
    label: "Publish",
    title: "Share a polished vertical video",
    copy: "Generate a ready-to-post Reel with synchronized narration, motion, and readable captions—then download or publish.",
  },
];

const examples = [
  {
    index: "A.01",
    category: "SPACE & SCIENCE",
    title: "Solar eclipse",
    description:
      "See how the Moon moves between the Sun and Earth in five clear animated scenes.",
    duration: "00:30",
    className: "example-space",
    visual: (
      <div className="orbit-visual" aria-hidden="true">
        <span className="sun" />
        <span className="orbit-line" />
        <span className="earth" />
        <span className="moon" />
      </div>
    ),
  },
  {
    index: "A.02",
    category: "MONEY & GROWTH",
    title: "Compound interest",
    description:
      "Follow one investment as growth builds on growth, year after year.",
    duration: "00:30",
    className: "example-finance",
    visual: (
      <div className="chart-visual" aria-hidden="true">
        <span style={{ height: "27%" }} />
        <span style={{ height: "43%" }} />
        <span style={{ height: "64%" }} />
        <span style={{ height: "88%" }} />
        <svg viewBox="0 0 220 110" role="presentation">
          <path d="M8 94 C52 86, 68 72, 95 63 S142 48, 168 25 S198 14, 214 8" />
        </svg>
      </div>
    ),
  },
  {
    index: "A.03",
    category: "TECH & LEARNING",
    title: "Binary search",
    description:
      "Watch a sorted list shrink by half until the target is found.",
    duration: "00:30",
    className: "example-search",
    visual: (
      <div className="array-visual" aria-hidden="true">
        {[3, 8, 12, 17, 23, 31, 42].map((item) => (
          <span key={item} className={item === 23 ? "found" : ""}>
            {item}
          </span>
        ))}
        <div className="array-pointer">TARGET</div>
      </div>
    ),
  },
];

const templates = [
  {
    code: "EXPL-01",
    title: "Clean Explainer",
    meta: "Concepts · 45–60s",
    visual: "template-nodes",
  },
  {
    code: "GUIDE-02",
    title: "Step-by-Step",
    meta: "Tutorials · 30–45s",
    visual: "template-steps",
  },
  {
    code: "DATA-03",
    title: "Data Story",
    meta: "Charts · 45–60s",
    visual: "template-data",
  },
];

function MotionlyMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M6 9.4 18 3l12 6.4v17.2L18 33 6 26.6V9.4Z" />
      <path d="m11.5 22.5 6.2-10 3.2 5.2 3.6-2.1" />
      <circle cx="24.5" cy="15.6" r="2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 5.5 7 4.5-7 4.5v-9Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Motionly home">
          <MotionlyMark />
          <span>Motionly</span>
        </a>

        <nav aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#templates">Templates</a>
          <a href="#examples">Examples</a>
          <a href="#quality">Resources</a>
        </nav>

        <div className="header-actions">
          <a className="sign-in-placeholder" href="/sign-in">
            Sign in
          </a>
          <a className="button button-small button-primary" href="/sign-up">
            Create a video
            <ArrowIcon />
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" id="top">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="section-kicker">
                <span className="kicker-dot" />
                CREATIVE VIDEO WORKSPACE
              </div>
              <h1>
                Ideas, taught
                <span>in motion.</span>
              </h1>
              <p className="hero-lede">
                Turn any concept into a clear, narrated animated video—planned,
                voiced, captioned, and rendered in one creative workflow.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="/sign-up">
                  Create your first video
                  <ArrowIcon />
                </a>
                <a className="button button-secondary" href="#product">
                  <PlayIcon />
                  Watch 60-sec demo
                </a>
              </div>
              <div className="hero-proof" aria-label="Product capabilities">
                <div>
                  <strong>9:16</strong>
                  <span>Instagram-ready</span>
                </div>
                <div>
                  <strong>Aditi</strong>
                  <span>Indian English voice</span>
                </div>
                <div>
                  <strong>1 flow</strong>
                  <span>Idea to finished video</span>
                </div>
              </div>
            </div>

            <div
              className="hero-studio"
              id="product"
              aria-label="Motionly storyboard preview"
            >
              <div className="studio-chrome">
                <div className="window-controls" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span>HOW HABITS FORM · PROJECT</span>
                <span className="studio-status">LIVE PREVIEW</span>
              </div>

              <div className="studio-body">
                <aside className="story-rail" aria-label="Storyboard scenes">
                  <span className="rail-label">STORY RAIL</span>
                  {["Hook", "Cue", "Routine", "Reward"].map((label, index) => (
                    <div
                      className={`rail-scene ${index === 1 ? "active" : ""}`}
                      key={label}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{label}</strong>
                    </div>
                  ))}
                </aside>

                <div className="studio-canvas">
                  <div className="canvas-toolbar">
                    <span>SCENE 02 / THE CUE</span>
                    <span>00:12 — 00:19</span>
                  </div>
                  <div className="phone-stage">
                    <div className="phone-frame">
                      <div className="phone-content">
                        <span className="phone-label">HABIT LOOP</span>
                        <div className="habit-loop" aria-hidden="true">
                          <span className="habit-node node-cue">Cue</span>
                          <span className="habit-node node-routine">
                            Routine
                          </span>
                          <span className="habit-node node-reward">Reward</span>
                          <svg viewBox="0 0 220 210" role="presentation">
                            <path d="M65 55 C125 15 187 46 182 105" />
                            <path d="M176 145 C132 194 59 171 43 116" />
                            <path d="M42 91 C43 73 50 62 65 54" />
                          </svg>
                        </div>
                        <p className="caption-preview">
                          Every habit begins with a <mark>cue.</mark>
                        </p>
                      </div>
                    </div>
                    <div className="stage-note note-one">VOICE SYNCED</div>
                    <div className="stage-note note-two">CAPTIONS ON</div>
                  </div>
                </div>
              </div>

              <div
                className="studio-timeline"
                aria-label="Animation timeline preview"
              >
                <div className="timeline-meta">
                  <span>00:12.4</span>
                  <span>VOICE</span>
                  <span>CAPTIONS</span>
                  <span>VISUALS</span>
                </div>
                <div className="timeline-tracks">
                  <div className="playhead" />
                  <div className="track waveform-track">
                    {[
                      18, 32, 12, 40, 22, 47, 28, 38, 17, 44, 25, 34, 19, 42,
                      23, 31,
                    ].map((height, index) => (
                      <span key={index} style={{ height }} />
                    ))}
                  </div>
                  <div className="track caption-track">
                    <span>Every habit</span>
                    <span>begins with a cue</span>
                  </div>
                  <div className="track visual-track">
                    <span>CUE APPEARS</span>
                    <span>LOOP ROTATES</span>
                    <span>WORD HIGHLIGHT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="scroll-cue" aria-hidden="true">
            <span>SCROLL TO EXPLORE</span>
            <i />
          </div>
        </section>

        <section className="workflow-section" id="workflow">
          <div className="section-heading split-heading">
            <div>
              <div className="section-kicker">ONE CALM WORKFLOW</div>
              <h2>From rough thought to ready-to-share.</h2>
            </div>
            <p>
              No timeline expertise. No animation software. You stay in control
              of the idea while Motionly handles the production details.
            </p>
          </div>

          <div className="workflow-grid">
            {workflowSteps.map((step) => (
              <article className="workflow-card" key={step.number}>
                <div className="workflow-topline">
                  <span>{step.number}</span>
                  <strong>{step.label}</strong>
                </div>
                <div
                  className={`workflow-icon workflow-icon-${step.number}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="examples-section" id="examples">
          <div className="section-heading">
            <div className="section-kicker">REAL IDEAS · CLEAR STORIES</div>
            <h2>Different topics. One visual language.</h2>
            <p>
              Each example below is already proven in the Motionly rendering
              system—not a static concept mockup.
            </p>
          </div>

          <div className="examples-grid">
            {examples.map((example) => (
              <article
                className={`example-card ${example.className}`}
                key={example.title}
              >
                <div className="example-meta">
                  <span>{example.index}</span>
                  <span>{example.category}</span>
                  <span>{example.duration}</span>
                </div>
                <div className="example-visual">{example.visual}</div>
                <div className="example-copy">
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                  <span className="text-link">
                    View story flow <ArrowIcon />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="templates-section" id="templates">
          <div className="template-intro">
            <div className="section-kicker">REUSABLE MOTION SYSTEMS</div>
            <h2>A strong visual starting point for every story.</h2>
            <p>
              Choose a style, then let your content shape it. Every template
              uses editable scenes, narration, captions, and deterministic
              motion primitives.
            </p>
            <span className="button button-dark">
              Explore all templates <ArrowIcon />
            </span>
          </div>

          <div className="template-list">
            {templates.map((template) => (
              <article className="template-card" key={template.code}>
                <div
                  className={`template-preview ${template.visual}`}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                  <i />
                </div>
                <div>
                  <span className="template-code">{template.code}</span>
                  <h3>{template.title}</h3>
                  <p>{template.meta}</p>
                </div>
                <span className="template-arrow">
                  <ArrowIcon />
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="quality-section" id="quality">
          <div className="quality-visual" aria-hidden="true">
            <div className="quality-grid-lines" />
            <div className="quality-ring ring-one" />
            <div className="quality-ring ring-two" />
            <span className="quality-center">M</span>
            <div className="quality-badge badge-one">SCHEMA VALID</div>
            <div className="quality-badge badge-two">FRAME ALIGNED</div>
            <div className="quality-badge badge-three">REVIEW FIRST</div>
          </div>
          <div className="quality-copy">
            <div className="section-kicker">BUILT FOR CLARITY</div>
            <h2>Creative freedom, with dependable guardrails.</h2>
            <p>
              Motionly separates creative planning from deterministic rendering.
              Your storyboard is validated before it reaches the animation
              system, and you approve the plan before generation.
            </p>
            <ul>
              <li>
                <span>01</span>
                <div>
                  <strong>Review-first workflow</strong>
                  <p>
                    See the script and scene plan before narration or rendering
                    begins.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Registered motion templates</strong>
                  <p>
                    Validated data maps to known animation primitives—not
                    generated code.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Readable by design</strong>
                  <p>
                    Stable captions, clear diagrams, and motion that respects
                    reduced-motion settings.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="final-cta" id="start">
          <div className="cta-orbit orbit-a" aria-hidden="true" />
          <div className="cta-orbit orbit-b" aria-hidden="true" />
          <span className="cta-label">YOUR NEXT IDEA</span>
          <h2>Make the difficult feel obvious.</h2>
          <p>
            Bring one concept. Motionly will help shape the story, voice it
            clearly, and set it in motion.
          </p>
          <a className="button button-light" href="/sign-up">
            Create your first video
            <ArrowIcon />
          </a>
          <small>
            Start free. Verify your email, then shape your first idea.
          </small>
        </section>
      </main>

      <footer>
        <a
          className="brand footer-brand"
          href="#top"
          aria-label="Motionly home"
        >
          <MotionlyMark />
          <span>Motionly</span>
        </a>
        <p>Ideas, taught in motion.</p>
        <div>
          <span>© 2026 Motionly</span>
          <a href="#quality">Accessibility</a>
          <a href="#quality">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
