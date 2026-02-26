export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  featured: boolean;
  tags: string[];
  content: string; // markdown-style HTML content
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "ai-legal-research-philippines",
    title: "How AI is Transforming Legal Research in the Philippines",
    excerpt:
      "Discover how artificial intelligence is reshaping how Filipino lawyers conduct legal research, from automated case analysis to predictive legal outcomes.",
    category: "AI & Law",
    date: "2026-02-14",
    readTime: "8 min read",
    featured: true,
    tags: ["AI", "Legal Research", "Philippines", "Technology"],
    content: `
<h2>The Revolution Has Already Begun</h2>
<p>The practice of law in the Philippines has historically relied on exhaustive manual research — pouring through physical law reporters, the Official Gazette, and the Supreme Court's online E-Library. While these remain indispensable, the sheer volume of jurisprudence produced each year makes it increasingly difficult for any single practitioner to stay fully current.</p>
<p>Artificial intelligence is changing that. Not by replacing lawyers, but by giving them superpowers.</p>

<h2>The Scale of the Problem</h2>
<p>As of 2025, the Supreme Court of the Philippines has issued over 70,000 decisions. The Philippine legislature has enacted more than 11,000 Republic Acts. Add executive issuances, administrative orders, IRRs, BSP circulars, SEC memoranda, and international treaties — and the Philippine legal corpus is simply too vast for unaided human review.</p>
<p>A senior associate at a major Makati law firm might spend 60–70% of billable hours on research tasks that AI can dramatically accelerate.</p>

<h2>What AI Actually Does in Legal Research</h2>
<h3>1. Semantic Search Beyond Keywords</h3>
<p>Traditional legal databases rely on keyword matching. Search for "unlawful dismissal" and you miss cases that discuss "illegal termination" or "termination without just cause." AI-powered systems understand legal meaning — not just words — and surface genuinely relevant results regardless of exact phrasing.</p>

<h3>2. Automatic Citation Extraction</h3>
<p>Modern RAG (Retrieval-Augmented Generation) systems don't just find relevant cases — they extract the specific passages that answer your question, surface the exact case citations, and distinguish between binding and persuasive authority. This allows a lawyer to verify every AI-generated assertion against the underlying primary source.</p>

<h3>3. Predictive Legal Outcomes</h3>
<p>By analyzing patterns across thousands of court decisions on similar fact patterns, AI tools can offer probabilistic assessments of case outcomes. This doesn't replace legal judgment — it informs it. A lawyer can now tell a client objectively: "Based on 247 analogous decisions, courts have ruled in favor of the employee in approximately 68% of cases with these facts."</p>

<h3>4. Document Analysis at Scale</h3>
<p>Due diligence exercises that once required a team of associates and weeks of work can now be completed by AI in hours. Contracts, deeds, corporate documents — AI can cross-reference these against applicable law, flag inconsistencies, and generate risk matrices automatically.</p>

<h2>Philippine-Specific Challenges</h2>
<p>Deploying AI for Philippine legal research presents unique challenges that generic AI tools fail to address:</p>
<ul>
  <li><strong>Mixed-language decisions:</strong> Early Philippine Supreme Court decisions were written in Spanish, and many modern decisions mix English with Filipino. AI must handle code-switching gracefully.</li>
  <li><strong>Citation format variations:</strong> Philippine case citations follow multiple formats across eras (e.g., "G.R. No. 12345," "L-12345," supra, infra), requiring specialized parsing.</li>
  <li><strong>Jurisdictional hierarchy:</strong> The Philippine legal system has a distinct court hierarchy with the Supreme Court sitting en banc and in divisions — AI must correctly characterize the weight of each decision.</li>
  <li><strong>Recency of amendments:</strong> Philippine laws are frequently amended by subsequent legislation and executive issuances, and AI must always present the currently effective text.</li>
</ul>

<h2>The Human-AI Partnership</h2>
<p>The most important thing to understand about AI in legal research is that it does not eliminate the need for a lawyer. It eliminates the need for a lawyer to spend hours doing what a machine does better — exhaustive information retrieval — so that the lawyer can spend more time on what only humans can do: strategic judgment, client counseling, advocacy, and ethics.</p>
<p>The lawyer who uses AI will not be replaced by AI. The lawyer who refuses to use AI will be replaced by the lawyer who does.</p>

<h2>What JusConsultus Does Differently</h2>
<p>JusConsultus is built on Philippine law from the ground up. Our knowledge base includes the full text of Supreme Court decisions, Republic Acts, Executive Orders, Administrative Orders, and international treaties ratified by the Philippines. Every answer is traceable to a primary source — because in law, an unverifiable answer is no answer at all.</p>
<p>With Context Aware v1, the system remembers the context of your full legal research session, building on prior exchanges to deliver progressively more targeted results. Ask about estoppel, then ask a follow-up about its application in land registration — and the system understands the connection.</p>

<h2>The Road Ahead</h2>
<p>The integration of AI into Philippine legal practice is not a distant future — it is happening now. Law schools are beginning to teach AI literacy. The Integrated Bar of the Philippines has initiated discussions on ethical guidelines for AI use. The Supreme Court itself has acknowledged the role of technology in improving access to justice.</p>
<p>The question is no longer whether AI will transform Philippine legal research. The question is how quickly practitioners will adapt — and those who adapt fastest will have a decisive competitive advantage.</p>
    `,
  },
  {
    id: "understanding-data-privacy-act",
    title: "A Comprehensive Guide to the Data Privacy Act of 2012 (R.A. 10173)",
    excerpt:
      "Everything practitioners need to know about the Data Privacy Act — from the rights of data subjects to the obligations of personal information controllers and processors.",
    category: "Philippine Law",
    date: "2026-01-28",
    readTime: "12 min read",
    featured: true,
    tags: ["Data Privacy", "Republic Act 10173", "NPC", "Compliance"],
    content: `
<h2>Overview</h2>
<p>Republic Act No. 10173, or the <strong>Data Privacy Act of 2012</strong>, is the primary legislation governing the processing of personal information in the Philippines. Implemented by the <strong>National Privacy Commission (NPC)</strong> and its Implementing Rules and Regulations (IRR), the law aligns the Philippines with international data protection standards, particularly the European Union's General Data Protection Regulation (GDPR).</p>
<p>Understanding the DPA is essential not only for compliance officers and IT professionals but for every lawyer who handles client data — which is effectively every lawyer in practice.</p>

<h2>Key Definitions</h2>
<h3>Personal Information</h3>
<p>Under Section 3(g), "personal information" refers to any information from which the identity of an individual is apparent or can be reasonably and directly ascertained by the entity holding the information, or when put together with other information would directly and certainly identify an individual.</p>

<h3>Sensitive Personal Information</h3>
<p>The Act distinguishes between ordinary personal information and <strong>sensitive personal information</strong>, which includes:</p>
<ul>
  <li>Race, ethnic origin, marital status, age, color, and religious, philosophical or political affiliations</li>
  <li>Health, education, genetic or sexual life of a person, or to any proceeding for any offense committed or alleged</li>
  <li>Social security numbers</li>
  <li>Specifically established by an executive order or an act of Congress to be kept classified</li>
</ul>

<h3>Personal Information Controller vs. Processor</h3>
<p>A <strong>Personal Information Controller (PIC)</strong> is a natural or juridical person that controls the collection, holding, processing or use of personal information. A <strong>Personal Information Processor (PIP)</strong> refers to any natural or juridical person qualified to act as such to whom a PIC may outsource or instruct the processing of personal data.</p>

<h2>Criteria for Lawful Processing</h2>
<p>Processing of personal information is permitted only if not otherwise prohibited by law and when at least one of the following conditions exist:</p>
<ol>
  <li>The data subject has given his or her <strong>consent</strong></li>
  <li>The processing of personal information is <strong>necessary</strong> and is related to the fulfillment of a contract</li>
  <li>The processing is necessary for compliance with a <strong>legal obligation</strong></li>
  <li>The processing is necessary for the <strong>vital interests</strong> of the data subject</li>
  <li>The processing is necessary in order to respond to national <strong>emergency</strong></li>
  <li>The processing is necessary for the <strong>legitimate interests</strong> pursued by the PIC</li>
</ol>

<h2>Rights of the Data Subject</h2>
<p>Under Section 16, every data subject is entitled to the following rights:</p>
<h3>Right to be Informed</h3>
<p>Data subjects must be informed that their personal information shall be, are being, or have been processed. This includes information about the identity of the PIC, the purpose of processing, the scope and method of collection, and the recipients of the data.</p>

<h3>Right to Access</h3>
<p>Data subjects have the right to reasonable access, upon demand, to their personal information in the custody of a PIC. This includes the sources of such information, names and addresses of recipients, the manner of processing, the reasons for disclosure, information on automated processes, date of last access, and the designation of the data protection officer.</p>

<h3>Right to Rectification</h3>
<p>Data subjects have the right to dispute the inaccuracy or error in their personal information and have the PIC correct it immediately and accordingly, unless the request is vexatious or otherwise unreasonable.</p>

<h3>Right to Erasure or Blocking</h3>
<p>The right to suspend, withdraw, or order the blocking, removal or destruction of personal information where it is incomplete, outdated, false, unlawfully obtained, used for unauthorized purposes, or no longer necessary for the purposes for which they were collected.</p>

<h3>Right to Data Portability</h3>
<p>Where the personal information is processed by electronic means and in a structured and commonly used format, the data subject shall have the right to obtain a copy of such data in an electronic or structured format.</p>

<h2>Obligations of PICs and PIPs</h2>
<h3>Data Protection Officer (DPO)</h3>
<p>PICs and PIPs who employ more than 250 persons, or whose processing is likely to pose a risk to the rights and freedoms of data subjects, must designate a <strong>Data Protection Officer (DPO)</strong>. The DPO must be registered with the NPC.</p>

<h3>Privacy Impact Assessment</h3>
<p>PICs must conduct a <strong>Privacy Impact Assessment (PIA)</strong> for high-risk processing activities to identify and manage risks associated with the processing of personal information.</p>

<h3>Security Measures</h3>
<p>Section 20 requires PICs to implement reasonable and appropriate organizational, physical, and technical measures intended for the protection of personal information against any accidental or unlawful destruction, alteration and disclosure, as well as against any other unlawful processing.</p>

<h3>Breach Notification</h3>
<p>In case of a personal data breach, PICs must notify the NPC within <strong>72 hours</strong> upon knowledge of such breach. The affected data subjects must also be notified within a reasonable period from discovery of the breach.</p>

<h2>Prohibited Acts and Penalties</h2>
<p>The DPA provides for both criminal and civil liability. Prohibited acts include:</p>
<ul>
  <li>Unauthorized processing — imprisonment of 1-3 years, fine of ₱500,000 to ₱2,000,000</li>
  <li>Processing for unauthorized purpose — 1.5-5 years, ₱500,000 to ₱1,000,000</li>
  <li>Unauthorized access or intentional breach — 1-3 years, ₱500,000 to ₱2,000,000</li>
  <li>Concealment of security breach — 1.5-5 years, ₱500,000 to ₱1,000,000</li>
  <li>Malicious disclosure — 1.5-5 years, ₱500,000 to ₱1,000,000</li>
</ul>

<h2>Law Firm Compliance Considerations</h2>
<p>Law firms are PICs with respect to client data. Compliance obligations include maintaining a privacy notice, ensuring lawful basis for retaining client information, implementing data retention schedules (particularly given the attorney-client privilege overlap), securing client files both physically and electronically, and registering data processing systems with the NPC where required.</p>
<p>The attorney-client privilege does not exempt law firms from DPA compliance — it supplements it. Both regimes must be observed simultaneously.</p>
    `,
  },
  {
    id: "jusconsultus-context-awareness",
    title: "Introducing Context Awareness v1: Smarter Legal AI",
    excerpt:
      "Our new Context Awareness engine understands the full scope of your legal query, delivering more accurate and relevant results for Philippine jurisprudence.",
    category: "Legal Tech",
    date: "2026-01-10",
    readTime: "5 min read",
    featured: false,
    tags: ["Product Update", "AI", "Context Awareness"],
    content: `
<h2>The Problem with Stateless Legal AI</h2>
<p>Most AI assistants operate statelessly — each query is treated in isolation, with no memory of what was asked before. For casual tasks, this is acceptable. For legal research, it is a serious limitation.</p>
<p>Legal research is inherently sequential. You don't ask a single question and receive a final answer. You ask a question, receive an answer, identify a related issue, ask a follow-up, and progressively refine your understanding of a legal problem. A stateless AI forces you to re-establish context with every prompt — wasting time and often producing less precise results.</p>

<h2>Introducing Context Awareness v1</h2>
<p><strong>Context Awareness v1</strong> is JusConsultus's new multi-turn conversational engine, designed specifically for the iterative nature of legal research. Unlike standard query-response systems, Context Aware v1:</p>
<ul>
  <li><strong>Remembers your full session context</strong> — asks asked five messages ago are still factored into current responses</li>
  <li><strong>Tracks the legal problem you're solving</strong> — as you refine your query, the system builds a richer internal model of the legal issue</li>
  <li><strong>Distinguishes between topic shifts and refinements</strong> — a follow-up on the same case is treated differently from an entirely new query</li>
  <li><strong>Maintains citation continuity</strong> — sources cited in earlier responses are carried forward and can be referenced in later answers</li>
</ul>

<h2>How It Works Under the Hood</h2>
<p>Context Awareness v1 uses a sliding window context architecture with dynamic relevance scoring. Each user message is analyzed not only in isolation but in relation to the full conversation history. High-relevance prior exchanges are retained in the active context window; low-relevance exchanges are summarized and compressed.</p>
<p>This approach ensures that context doesn't degrade over long sessions. A 20-message research session is just as coherent as a 3-message session.</p>

<h2>Practical Example</h2>
<p>Without context awareness:</p>
<blockquote>
  <em>User: "What is the quantum of evidence in administrative cases?"</em><br/>
  <em>AI: "Substantial evidence is required..."</em><br/>
  <em>User: "What about in the context of dismissal?"</em><br/>
  <em>AI: [Treats this as a new, unrelated query — may discuss criminal dismissal]</em>
</blockquote>
<p>With Context Awareness v1:</p>
<blockquote>
  <em>User: "What is the quantum of evidence in administrative cases?"</em><br/>
  <em>AI: "Substantial evidence is required..."</em><br/>
  <em>User: "What about in the context of dismissal?"</em><br/>
  <em>AI: [Understands "dismissal" refers to administrative dismissal from government service, provides directly relevant answer]</em>
</blockquote>

<h2>When to Use Context Aware v1</h2>
<p>Context Aware v1 is ideal for:</p>
<ul>
  <li>Multi-issue case analysis spanning several turns</li>
  <li>Research sessions where you're exploring a novel legal theory</li>
  <li>Due diligence tasks where each document raises follow-up questions</li>
  <li>Drafting assistance where multiple rounds of refinement are required</li>
</ul>
<p>For single quick reference queries — "What is the prescriptive period for estafa?" — the Standard mode remains the fastest option.</p>

<h2>What's Next: Context Awareness v2</h2>
<p>We're already developing Context Awareness v2, which will introduce persistent cross-session memory — allowing JusConsultus to remember facts and positions from previous research sessions on the same case or client matter. v2 will also introduce explicit fact anchors, allowing you to pin specific facts that the AI must always consider in subsequent responses.</p>
    `,
  },
  {
    id: "supreme-court-digest-2024",
    title: "Top Supreme Court Decisions of 2024: Year in Review",
    excerpt:
      "A curated digest of the most impactful Supreme Court decisions rendered in 2024, covering labor, criminal, civil, and constitutional law.",
    category: "Case Studies",
    date: "2025-12-20",
    readTime: "15 min read",
    featured: false,
    tags: ["Supreme Court", "Jurisprudence", "2024", "Case Digest"],
    content: `
<h2>Introduction</h2>
<p>The Philippine Supreme Court rendered hundreds of decisions in 2024, clarifying doctrine in areas ranging from cybercrime to property registration, and refining long-established rules in labor law and civil procedure. This digest presents the most doctrinally significant decisions of the year.</p>
<p><em>Note: Specific G.R. numbers and exact dates are for illustration. Practitioners should verify citations against official reports.</em></p>

<h2>Labor Law</h2>
<h3>On the Four-Fold Test and Economic Reality Test</h3>
<p>In several 2024 decisions, the Court reiterated the application of both the <strong>four-fold test</strong> (selection and engagement, payment of wages, power of dismissal, and power to control) and the <strong>economic reality test</strong> in determining the existence of an employer-employee relationship. The Court emphasized that the control test remains the most significant — specifically, whether the alleged employer controls not merely the result of the work but also the means and methods by which it is accomplished.</p>

<h3>Regular vs. Project Employment</h3>
<p>The Court continued to refine the distinction between regular and project employees in the construction industry. The key issue remains whether the employment was coterminous with a specific project or undertaking, and whether the employee was repeatedly rehired on multiple projects — the latter indicating regular employment status regardless of designation in the contract.</p>

<h3>Constructive Dismissal</h3>
<p>In a significant labor decision, the Court found constructive dismissal where an employer unilaterally transferred an employee to a distant post without valid reason, effectively making continued employment untenable. The Court stressed that a transfer, although within management prerogative, must be exercised in good faith and not as a device to force resignation.</p>

<h2>Criminal Law</h2>
<h3>Cybercrime — Online Libel</h3>
<p>The Court addressed due process and venue issues in online libel cases under R.A. 10175 (Cybercrime Prevention Act). The Court clarified that venue for online libel lies where the offended party resides or where any element of the offense was committed — including where the libelous material was first accessed. This ruling has significant implications for the filing of online libel complaints nationwide.</p>

<h3>Dangerous Drugs — Chain of Custody</h3>
<p>Consistent with its jurisprudence on R.A. 9165, the Court acquitted several accused in drug cases due to breaks in the chain of custody. The Court reiterated that strict compliance with Section 21 of the Comprehensive Dangerous Drugs Act — including the required presence of an elected official, a DOJ representative, and a media representative during inventory — is mandatory, and non-compliance without justifiable grounds results in the inadmissibility of seized evidence.</p>

<h2>Civil Law</h2>
<h3>Prescription of Actions — Torrens System</h3>
<p>The Court reiterated that actions to reconvey land registered under the Torrens system based on implied trust prescribe in 10 years from the registration of the title, while actions based on fraudulent registration prescribe in four years. The distinction between express and implied trusts, and the reckoning of the prescriptive period, were carefully analyzed.</p>

<h3>Annulment vs. Declaration of Nullity</h3>
<p>The Court reiterated clear distinctions between voidable marriages subject to annulment under Article 45 of the Family Code and void marriages subject to declaration of nullity under Article 36 (psychological incapacity). The Court emphasized that psychological incapacity must be characterized by gravity, juridical antecedence, and incurability — reaffirming the standard set in <em>Santos v. Court of Appeals</em> and clarified in <em>Republic v. Molina</em>.</p>

<h2>Constitutional Law</h2>
<h3>Separation of Powers — Emergency Powers</h3>
<p>In a significant constitutional decision, the Court addressed the scope of emergency powers granted to the executive under Article VI, Section 23 of the 1987 Constitution. The Court emphasized that emergency powers are delegated, not inherent, and must be exercised strictly within the scope authorized by Congress. Deviation from the delegated scope renders executive acts ultra vires.</p>

<h3>Judicial Review — Political Question Doctrine</h3>
<p>The Court clarified the contours of the political question doctrine in the context of treaty implementation and foreign policy. While the Court acknowledged areas of diplomatic discretion reserved to the executive, it reaffirmed that justiciable constitutional questions embedded in political acts remain subject to judicial review — consistent with the expanded certiorari jurisdiction under Article VIII, Section 1.</p>

<h2>Commercial Law</h2>
<h3>Corporation — Piercing the Veil</h3>
<p>The Court applied the alter ego doctrine to pierce the corporate veil in a case involving a series of corporations controlled by the same individual family to evade outstanding judgments. The Court reiterated that the separate legal personality of a corporation may be disregarded where the fiction is used as a shield to perpetrate fraud, defeat public convenience, justify wrong, protect crime, or defend crime.</p>

<h2>Conclusion</h2>
<p>The 2024 Supreme Court docket reflects a Court actively refining Philippine doctrine to address the complexities of modern commerce, technology, and constitutional governance. Legal practitioners are encouraged to review the full text of each decision and any subsequent clarificatory resolutions before relying on them in pleadings.</p>
    `,
  },
  {
    id: "legal-document-automation",
    title: "Automating Legal Document Drafting: Best Practices for Filipino Lawyers",
    excerpt:
      "Learn how to leverage document templates and AI-assisted drafting to reduce turnaround time while maintaining the quality of your legal documents.",
    category: "Guides",
    date: "2025-12-05",
    readTime: "10 min read",
    featured: false,
    tags: ["Document Drafting", "Automation", "Legal Tech", "Guides"],
    content: `
<h2>The Case for Document Automation</h2>
<p>A significant portion of legal work involves drafting documents that, while requiring legal expertise, follow predictable structures: demand letters, affidavits, special powers of attorney, deeds of absolute sale, employment contracts, lease agreements, and corporate resolutions. For experienced practitioners, these documents represent well-worn paths. The challenge is making those paths faster without cutting corners.</p>
<p>Document automation — the use of templates and AI to generate first drafts — can reduce document preparation time by 40–70% on standard instruments, freeing lawyer time for higher-value tasks like negotiation, strategy, and advocacy.</p>

<h2>Tier 1: Template Libraries</h2>
<p>The foundation of document automation is a well-organized template library. Every law office should maintain:</p>
<ul>
  <li><strong>Reviewed base templates</strong> for each common document type, drafted by senior attorneys and reviewed for current legal accuracy</li>
  <li><strong>Version control</strong> so that templates reflect the latest applicable law and practice</li>
  <li><strong>Clear variable markers</strong> (e.g., [CLIENT NAME], [PROPERTY DESCRIPTION]) to ensure consistent completion</li>
  <li><strong>Annotation layers</strong> explaining why each clause was drafted as it was, useful for training junior associates</li>
</ul>

<h2>Tier 2: Clause Libraries</h2>
<p>More advanced than full-document templates, clause libraries allow the assembly of bespoke documents from pre-approved clauses. A real estate firm, for example, might maintain a library of:</p>
<ul>
  <li>Warranty clauses (various risk allocations)</li>
  <li>Governing law and dispute resolution clauses</li>
  <li>Force majeure definitions (pre- and post-COVID versions)</li>
  <li>Payment schedule variations</li>
  <li>Default and remedy provisions</li>
</ul>
<p>Lawyers assemble contracts by selecting appropriate clauses rather than drafting from scratch — significantly reducing drafting time while ensuring every clause has been pre-reviewed for legal sufficiency.</p>

<h2>Tier 3: AI-Assisted Drafting</h2>
<p>AI brings the next level of automation. Rather than filling in blanks on a static template, AI can:</p>
<h3>Generate Context-Specific First Drafts</h3>
<p>Given a description of the transaction — parties, subject matter, key commercial terms, risk positions — AI can produce a coherent first draft that a lawyer then reviews and refines. This is dramatically faster than drafting from a blank page or a template that requires heavy modification.</p>

<h3>Flag Missing Elements</h3>
<p>AI can review a completed draft against a standard checklist for that document type and flag potentially missing provisions: "This employment contract does not address post-employment non-compete obligations" or "This deed does not include a tax declaration reference."</p>

<h3>Suggest Applicable Provisions</h3>
<p>When drafting a contracts involving real property in the Philippines, AI can automatically suggest including the relevant HLURB/DHSUD provisions, tax obligation allocations under the Local Government Code, and documentary stamp tax obligations under the National Internal Revenue Code.</p>

<h2>Quality Control: The Human Review Layer</h2>
<p>Automation does not eliminate, and must not eliminate, the lawyer's review. Every AI-generated or auto-assembled document must be reviewed by a licensed attorney before use. Key review checkpoints:</p>
<ol>
  <li><strong>Legal accuracy</strong> — do the provisions accurately state applicable Philippine law?</li>
  <li><strong>Factual accuracy</strong> — does the document accurately reflect the actual transaction details?</li>
  <li><strong>Client-specific risks</strong> — are there risks specific to this client or transaction that a generic template would not capture?</li>
  <li><strong>Court or agency requirements</strong> — does the document comply with any specificformat or execution requirements (e.g., notarization, acknowledgment sections)?</li>
</ol>

<h2>Ethical Considerations</h2>
<p>The use of AI in document drafting raises several ethical considerations under the Code of Professional Responsibility and Accountability (CPRA):</p>
<ul>
  <li><strong>Competence:</strong> Lawyers who use AI tools remain fully responsible for the quality of their output. Submitting a defective AI-generated document is no defense to a competence complaint.</li>
  <li><strong>Supervision:</strong> Lawyers must supervise the use of AI by non-lawyer staff as they would supervise any work product.</li>
  <li><strong>Confidentiality:</strong> Client information entered into AI tools must be treated as confidential. Lawyers should use tools that comply with the Data Privacy Act and whose confidentiality policies have been reviewed.</li>
</ul>

<h2>Getting Started</h2>
<p>The practical path to document automation for a Philippine law firm:</p>
<ol>
  <li>Audit your five most frequently-drafted document types</li>
  <li>Develop clean, reviewed base templates for each</li>
  <li>Implement version control (even a dated file naming convention is a start)</li>
  <li>Integrate an AI drafting assistant and run it in parallel with your existing process for 30 days</li>
  <li>Measure the time savings and review quality difference</li>
  <li>Scale to additional document types based on results</li>
</ol>
    `,
  },
  {
    id: "safe-spaces-act-implementation",
    title: "Implementation Challenges of the Safe Spaces Act (R.A. 11313)",
    excerpt:
      "An analysis of the practical challenges and considerations in implementing the Bawal Bastos Law across local government units and workplaces.",
    category: "Philippine Law",
    date: "2025-11-22",
    readTime: "7 min read",
    featured: false,
    tags: ["Safe Spaces Act", "Gender-Based Violence", "Workplace Law", "LGU"],
    content: `
<h2>Background</h2>
<p>Republic Act No. 11313, known as the <strong>Safe Spaces Act</strong> or the <em>Bawal Bastos Law</em>, was signed into law on April 17, 2019. It expanded and strengthened the Anti-Sexual Harassment Act of 1995 (R.A. 7877) by addressing gender-based sexual harassment across all settings: public spaces, online, workplaces, and educational institutions.</p>
<p>The law acknowledges that sexual harassment does not occur only in the employer-employee context but in every sphere of daily life — streets, public transportation, online platforms, and community spaces.</p>

<h2>Scope and Coverage</h2>
<h3>Public Spaces</h3>
<p>The law penalizes gender-based streets and public spaces sexual harassment, including catcalling, wolf-whistling, unwanted invitations, misogynistic, transphobic, homophobic, and sexist slurs, persistent uninvited comments or gestures, and stalking.</p>

<h3>Online Harassment</h3>
<p>Gender-based online sexual harassment includes acts that cause or are likely to cause mental, emotional or psychological distress to the victim, including persistent messaging, invasion of privacy through the taking and sharing of photos without consent, and any other acts of sexual harassment committed through computer systems.</p>

<h3>Workplaces and Educational Institutions</h3>
<p>The Act expands workplace sexual harassment to include acts committed by non-supervisory co-workers (peer-to-peer harassment) and by clients, customers, or partners — a significant expansion from the supervisor-subordinate framework of R.A. 7877.</p>

<h2>Key Implementation Challenges</h2>
<h3>1. Lack of Implementing Infrastructure at LGU Level</h3>
<p>The Act requires Local Government Units to establish mechanisms for receiving and acting on complaints of public space harassment. In practice, many barangays and city governments lack trained personnel, formal complaint procedures, and dedicated Gender and Development (GAD) offices capable of handling these complaints. The law's effectiveness in public spaces is therefore highly dependent on LGU capacity — which varies enormously across the country.</p>

<h3>2. Defining the Workplace under Expanded Coverage</h3>
<p>With remote and hybrid work now commonplace, defining the "workplace" for purposes of the Act has become more complex. Does a video call constitute a workplace setting? Is a work group chat a workplace communications channel subject to the Act's protections? Employers have been slow to update their policies to address these digital contexts, creating gaps in coverage.</p>

<h3>3. Educational Institution Compliance</h3>
<p>Schools and universities are required to create an Internal Committee on Decorum and Investigation (CODI). Many institutions have struggled to staff these committees with sufficiently trained members, and the dual role of faculty members (who may serve on CODIs while also being potential respondents) creates structural conflicts of interest.</p>

<h3>4. Online Harassment — Jurisdictional Complexity</h3>
<p>Gender-based online harassment often crosses jurisdictional lines. A harasser in Davao targeting a victim in Manila via a platform headquartered in California creates a complex intersection of local, national, and international legal frameworks. The Act provides criminal liability but the practical enforcement of online harassment provisions against pseudonymous or overseas actors remains difficult.</p>

<h3>5. Low Complaint Rates and Social Barriers</h3>
<p>Despite the law's broad coverage, complaint rates remain relatively low. Survivors face significant barriers: fear of retaliation, stigma, skepticism about the effectiveness of formal processes, lack of legal representation, and — particularly in workplace settings — economic dependence on the harasser.</p>

<h2>Recommendations for Employers</h2>
<p>Organizations seeking genuine compliance (rather than paper compliance) with the Safe Spaces Act should:</p>
<ul>
  <li>Conduct a comprehensive review of existing anti-harassment policies to ensure coverage of peer-to-peer harassment, third-party harassment, and digital harassment</li>
  <li>Establish clear, accessible, trauma-informed complaint procedures with multiple reporting pathways</li>
  <li>Train all employees — not just HR and management — on the Act's coverage and prohibitions</li>
  <li>Ensure that CODI members are adequately trained and that conflicts of interest are managed proactively</li>
  <li>Implement anonymous reporting mechanisms to reduce barriers to complaint filing</li>
  <li>Regularly audit complaint data for patterns indicating systemic issues</li>
</ul>

<h2>Penalties</h2>
<p>Penalties under the Act range from administrative reprimand and community service for first offenses of public-space harassment to fines of up to ₱500,000 and imprisonment for more serious and repeat offenses. Educational institutions and employers that fail to act on complaints may also face administrative and criminal liability.</p>

<h2>Conclusion</h2>
<p>The Safe Spaces Act represents a significant legislative achievement. Its full realization, however, depends not on the text of the law but on the political will of LGUs, the institutional commitment of employers and educational institutions, and the availability of accessible legal remedies for survivors. Lawyers advising organizations have a responsibility to close the gap between legal text and lived reality.</p>
    `,
  },
  {
    id: "rag-for-legal-professionals",
    title: "What is Retrieval-Augmented Generation and Why It Matters for Law",
    excerpt:
      "Understanding how RAG technology enables AI systems to provide accurate, citation-backed legal answers instead of generic responses.",
    category: "AI & Law",
    date: "2025-11-15",
    readTime: "6 min read",
    featured: false,
    tags: ["RAG", "AI Technology", "Legal Research", "Citations"],
    content: `
<h2>The Hallucination Problem</h2>
<p>Anyone who has used a general-purpose AI chatbot for legal research has encountered the hallucination problem: the AI confidently cites a case that does not exist, quotes a statute with an incorrect provision, or states a legal rule that was reversed years ago. For casual queries, this is inconvenient. In legal practice, it is dangerous.</p>
<p>The hallucination problem arises because large language models (LLMs) work by predicting plausible text based on patterns in their training data. They do not retrieve facts — they generate text that <em>sounds</em> like facts. A fictional case citation can be just as linguistically plausible as a real one to the model's prediction mechanism.</p>
<p><strong>Retrieval-Augmented Generation (RAG)</strong> is the technology architecture that directly addresses this problem.</p>

<h2>How RAG Works</h2>
<p>RAG combines two processes:</p>
<ol>
  <li><strong>Retrieval:</strong> When a query is received, the system searches a curated, verified knowledge base for the most relevant documents — actual cases, statutes, regulations — that bear on the question. These documents are retrieved as text chunks.</li>
  <li><strong>Generation:</strong> The retrieved documents are passed to the language model as context. The model does not generate an answer from memory — it synthesizes an answer <em>from the retrieved documents</em>.</li>
</ol>
<p>The critical difference: the AI's answer is grounded in specific documents that can be verified. Every factual claim in the response can be traced back to a source document in the knowledge base.</p>

<h2>The Components of a Legal RAG System</h2>
<h3>The Knowledge Base</h3>
<p>The quality of a RAG system is entirely dependent on the quality of its knowledge base. For Philippine legal AI, the knowledge base must include:</p>
<ul>
  <li>Full text of Supreme Court decisions (en banc and division)</li>
  <li>Republic Acts, Presidential Decrees, Commonwealth Acts, and Executive Orders</li>
  <li>Administrative Orders, Memorandum Circulars, and Department Orders</li>
  <li>Ratified international treaties and conventions</li>
  <li>Rules of Court and procedural issuances</li>
</ul>
<p>Incomplete or outdated knowledge bases produce incomplete or outdated answers — regardless of how sophisticated the AI model is.</p>

<h3>The Embedding and Retrieval Layer</h3>
<p>Text from the knowledge base is converted into numerical representations (embeddings) that capture semantic meaning. When a query arrives, the query is similarly embedded, and the system identifies the knowledge base documents whose embeddings are most similar to the query. This allows semantic matching — finding documents about "illegal dismissal" even if the query uses the phrase "wrongful termination."</p>

<h3>The Generation Layer</h3>
<p>The top-ranked retrieved documents are passed to the language model as context. The model synthesizes an answer, ideally with explicit references to the source documents. In a well-designed legal RAG system, every factual assertion in the response is accompanied by a citation to the specific document from which it was derived.</p>

<h2>Why Citations Are Non-Negotiable in Legal AI</h2>
<p>In any other domain, an approximately correct answer might be acceptable. In law, an unverified answer can expose a client to harm and a lawyer to malpractice liability. The duty of competence requires not just getting the right answer, but being able to verify it.</p>
<p>A legal RAG system that returns answers with inline citations allows the practitioner to:</p>
<ul>
  <li>Verify that the cited case exists and says what the AI says it says</li>
  <li>Check whether the case has been affirmed, modified, or reversed</li>
  <li>Read the full case to assess whether the specific facts are analogous</li>
  <li>Cite the primary source in pleadings rather than the AI response</li>
</ul>
<p>This is why JusConsultus presents every response with source citations — not as an optional feature, but as a fundamental design requirement. The AI is a research assistant, not an oracle.</p>

<h2>RAG vs. Fine-Tuned Models</h2>
<p>An alternative to RAG is fine-tuning: training a language model on a specialized legal corpus so it "knows" legal information directly. Fine-tuning has advantages for stylistic tasks (drafting in legal style) but significant disadvantages for factual accuracy:</p>
<ul>
  <li>Fine-tuned model knowledge is static — it does not update when new cases are decided</li>
  <li>Fine-tuning cannot eliminate hallucinations — it can reduce them but not eliminate them</li>
  <li>Fine-tuned models cannot cite specific passages — they have absorbed information but cannot point to where it came from</li>
</ul>
<p>RAG is dynamically updatable (add new cases to the knowledge base), citation-native, and more transparent. For legal applications where accuracy and verifiability are paramount, RAG is the superior architecture.</p>
    `,
  },
  {
    id: "family-code-amendments-2024",
    title: "Recent Amendments to the Family Code: What You Need to Know",
    excerpt:
      "A practitioner's guide to the latest amendments affecting marriage, property relations, and parental authority under Philippine law.",
    category: "Philippine Law",
    date: "2025-11-08",
    readTime: "9 min read",
    featured: false,
    tags: ["Family Code", "Marriage", "Parental Authority", "Property Relations"],
    content: `
<h2>Overview of the Family Code</h2>
<p>Executive Order No. 209, as amended by E.O. 227, known as the <strong>Family Code of the Philippines</strong>, has governed marriage, family relations, property between spouses, and parental authority since August 3, 1988. While the Code itself has not been entirely revised, significant amendments and clarifications from legislation, executive issuances, and Supreme Court jurisprudence have substantially shaped its application in the 21st century.</p>

<h2>Marriage: Psychological Incapacity under Article 36</h2>
<p>No provision of the Family Code has generated more Supreme Court attention than Article 36, which provides that a marriage is void from the beginning where one or both parties were psychologically incapacitated to comply with the essential marital obligations at the time of the celebration.</p>

<h3>The Tan-Andal Standard</h3>
<p>In the landmark 2021 decision <em>Tan-Andal v. Andal</em> (G.R. No. 196359, May 11, 2021), the Supreme Court  substantially revised the doctrine on psychological incapacity, moving away from the rigid requirements of the <em>Molina</em> guidelines. Key changes:</p>
<ul>
  <li>Psychological incapacity need not be a mental or personality disorder diagnosable by psychiatrists</li>
  <li>Expert testimony from a psychiatrist is no longer mandatory — the totality of evidence may suffice</li>
  <li>The incapacity need only be shown to be <strong>enduring</strong> — the term "incurable" was rephrased to allow for a showing that the incapacity is so persistent it renders compliance with marital obligations impossible</li>
  <li>Juridical antecedence (that the incapacity existed before the marriage) and gravity remain requirements</li>
</ul>
<p>Tan-Andal has significantly changed the landscape for petitions for declaration of nullity. Practitioners filing or defending such petitions must be thoroughly familiar with this decision and subsequent cases applying it.</p>

<h2>Property Relations: Absolute Community vs. Conjugal Partnership</h2>
<p>Under the Family Code, the default property regime for marriages celebrated on or after August 3, 1988, is <strong>Absolute Community of Property (ACP)</strong>, unless a different regime is stipulated in a marriage settlement before the wedding.</p>

<h3>Key Distinctions</h3>
<p>ACP covers all property owned by the spouses at the time of the marriage and acquired thereafter, with specific exclusions (inherited properties, property acquired by gratuitous title during the marriage, personal clothing, etc.). Under the <strong>Conjugal Partnership of Gains (CPG)</strong> — the default for marriages before 1988 — only the fruits and income of separate property and property acquired during the marriage through joint efforts form the conjugal partnership.</p>

<h3>Management and Disposition</h3>
<p>Both spouses have joint administration and enjoyment of the community or conjugal property. Any disposition or encumbrance of community or conjugal property without the consent of the other spouse is void — a rule that has generated extensive jurisprudence in real property transactions.</p>

<h2>Parental Authority and Parental Responsibility</h2>
<h3>R.A. 9858 — Recognition of Children of Annulled Marriages</h3>
<p>Republic Act No. 9858, signed on December 2, 2009, allows parties whose marriages have been annulled or declared void to cause the registration of natural children as legitimate, thereby conferring on them all the rights of legitimacy. This was a significant development for children born to parties whose marriage defects were not of their choosing.</p>

<h3>Courts and Custody Determinations</h3>
<p>In custody disputes, the Family Code establishes that no child under seven years of age shall be separated from the mother, unless the court finds compelling reasons to order otherwise. For children over seven, the court shall consider the choice of the child if the child is over ten years of age, in addition to the best interest of the child standard.</p>
<p>Philippine courts have consistently applied the <strong>best interest of the child</strong> as the paramount criterion, overriding the preference rules where the circumstances clearly require it. Practitioners should note that international parental abduction cases may also implicate the Hague Convention, to which the Philippines is a party through the Inter-Country Adoption Act and related issuances.</p>

<h2>Divorce for Muslims and Subsequent Proposals</h2>
<p>Under P.D. 1083 (Code of Muslim Personal Laws), Filipino Muslims may obtain a divorce. The status of divorce for non-Muslim Filipinos remains legally unavailable under the Family Code, a distinction repeatedly affirmed by the Supreme Court.</p>
<p>Pending legislation in Congress would introduce absolute divorce for non-Muslim Filipinos. As of this writing, no such law has been enacted. Practitioners should monitor legislative developments closely, as any enactment would require a comprehensive revision of property settlement procedures, custody arrangements, and support obligations currently structured around annulment and legal separation frameworks.</p>

<h2>Support Obligations</h2>
<p>Under Articles 194-208 of the Family Code, support encompasses everything indispensable for sustenance, dwelling, clothing, medical attendance, education, and transportation, in keeping with the financial capacity of the family. Support is demandable from the moment the need for it arises, and is payable in advance.</p>
<p>Courts have increasingly treated support as an urgency matter, allowing provisional support pending the final resolution of support petitions. The failure to comply with support orders is a civil contempt and may also constitute a criminal act of abandonment under the Revised Penal Code.</p>

<h2>Practical Implications for Family Law Practitioners</h2>
<p>The family law practitioner in 2025 must navigate:</p>
<ul>
  <li>The post-Tan-Andal petition for declaration of nullity landscape</li>
  <li>Increasing complexity in property settlement driven by digital assets, business interests, and overseas property</li>
  <li>International dimensions of custody disputes in an era of high Filipino diaspora</li>
  <li>The possibility of legislative reform on divorce that would fundamentally reshape practice</li>
</ul>
<p>Continuing education and close monitoring of Supreme Court issuances and legislative developments are not optional for family law practitioners — they are professional necessities.</p>
    `,
  },
];

export function getBlogPost(id: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.id === id);
}

export function getRelatedPosts(id: string, count = 3): BlogPost[] {
  const post = getBlogPost(id);
  if (!post) return [];
  return BLOG_POSTS.filter((p) => p.id !== id && (p.category === post.category || p.tags.some((t) => post.tags.includes(t)))).slice(0, count);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
