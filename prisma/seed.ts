import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.legalDocument.deleteMany();
  await prisma.template.deleteMany();

  // --- Supreme Court Decisions ---
  const supremeCourtDocs = [
    {
      category: "supreme_court",
      subcategory: "decisions",
      title: "People of the Philippines v. Madarang",
      number: "G.R. No. 132319",
      date: new Date("2000-05-12"),
      summary: "The Supreme Court ruled on the admissibility of extrajudicial confessions obtained without the assistance of counsel. The Court reiterated that confessions obtained in violation of Section 12, Article III of the 1987 Constitution are inadmissible in evidence.",
      doctrine: "An extrajudicial confession made without the assistance of counsel during custodial investigation is inadmissible in evidence against the accused.",
      facts: "The accused was arrested and subjected to custodial investigation without being informed of his right to remain silent and to have competent and independent counsel. During said investigation, the accused executed an extrajudicial confession admitting his participation in the crime charged.",
    },
    {
      category: "supreme_court",
      subcategory: "decisions",
      title: "Manila Electric Company v. Castillo",
      number: "G.R. No. 182703",
      date: new Date("2014-01-22"),
      summary: "The jurisdiction of regular courts over intra-corporate disputes when the Securities and Exchange Commission was divested of original jurisdiction. The Court clarified the requisites for the exercise of jurisdiction by the Regional Trial Court.",
      doctrine: "Under R.A. No. 8799 (Securities Regulation Code), the jurisdiction over intra-corporate disputes was transferred from the SEC to the RTCs designated as special commercial courts.",
    },
    {
      category: "supreme_court",
      subcategory: "decisions",
      title: "Ang Tibay v. Court of Industrial Relations",
      number: "G.R. No. L-46496",
      date: new Date("1940-02-27"),
      summary: "The Court laid down the cardinal primary requirements of due process in administrative proceedings, which must be observed by administrative tribunals in the exercise of their quasi-judicial functions.",
      doctrine: "The cardinal primary rights in administrative proceedings are: (1) right to a hearing; (2) consideration of evidence presented; (3) decision must have something to support itself; (4) evidence must be substantial; (5) decision must be rendered on the evidence presented; (6) tribunal must act on its own consideration of the evidence; (7) decision must be rendered in a manner that the parties can know the various issues involved.",
      facts: "National Labor Union, Inc. filed a complaint against Ang Tibay (Manila Leather Company). The Court of Industrial Relations certified the case. The employer argued that proper due process was not followed.",
    },
    {
      category: "supreme_court",
      subcategory: "decisions",
      title: "Oposa v. Factoran",
      number: "G.R. No. 101083",
      date: new Date("1993-07-30"),
      summary: "Landmark environmental law case where the Supreme Court recognized the standing of minors to file a class suit for the benefit of succeeding generations. The Court acknowledged the concept of intergenerational responsibility for the environment.",
      doctrine: "The right to a balanced and healthful ecology is a fundamental legal right that carries with it the correlative duty to refrain from impairing the environment. This right belongs not only to the present generation but to future generations as well.",
      facts: "A group of minors, represented by their parents, filed a taxpayers' class suit against the Secretary of DENR to cancel all existing Timber License Agreements (TLAs) in the country and to cease and desist from receiving, accepting, processing, renewing or approving new TLAs.",
    },
    {
      category: "supreme_court",
      subcategory: "decisions",
      title: "Marcos v. Manglapus",
      number: "G.R. No. 88211",
      date: new Date("1989-09-15"),
      summary: "The Supreme Court upheld the President's power to bar the return of the Marcos family to the Philippines in the interest of national security and public safety. The case involved the residual powers of the President under the Constitution.",
      doctrine: "The President has residual powers not specifically enumerated in the Constitution, which may be exercised in the interest of national security and public safety when the exercise thereof is not contrary to existing law.",
    },
    {
      category: "supreme_court",
      subcategory: "case_index",
      title: "Tanada v. Tuvera",
      number: "G.R. No. L-63915",
      date: new Date("1986-04-29"),
      summary: "The Supreme Court ruled that publication in the Official Gazette or in a newspaper of general circulation is an indispensable requirement for the effectivity of laws and administrative regulations.",
      doctrine: "Publication is indispensable in every case, but the legislature may in its discretion provide that the usual fifteen-day period shall be shortened or extended. All statutes, including those of local application, shall be published as a condition for their effectivity.",
    },
  ];

  // --- Republic Acts ---
  const lawsDocs = [
    {
      category: "laws",
      subcategory: "republic_acts",
      title: "Republic Act No. 11313 - Safe Spaces Act (Bawal Bastos Law)",
      number: "R.A. No. 11313",
      date: new Date("2019-04-17"),
      summary: "An Act Defining Gender-Based Sexual Harassment in Streets, Public Spaces, Online, Workplaces, and Educational or Training Institutions, Providing Protective Measures and Prescribing Penalties Therefor. The law penalizes catcalling, wolf-whistling, unwanted invitations, misogynistic, transphobic, homophobic and sexist slurs and other gender-based sexual harassment.",
    },
    {
      category: "laws",
      subcategory: "republic_acts",
      title: "Republic Act No. 10173 - Data Privacy Act of 2012",
      number: "R.A. No. 10173",
      date: new Date("2012-08-15"),
      summary: "An Act Protecting Individual Personal Information in Information and Communications Systems in the Government and the Private Sector, Creating for this Purpose a National Privacy Commission, and for Other Purposes.",
    },
    {
      category: "laws",
      subcategory: "republic_acts",
      title: "Republic Act No. 8353 - Anti-Rape Law of 1997",
      number: "R.A. No. 8353",
      date: new Date("1997-09-30"),
      summary: "An Act expanding the definition of the crime of rape, reclassifying the same as a crime against persons, amending for the purpose Act No. 3815 (Revised Penal Code).",
    },
    {
      category: "laws",
      subcategory: "republic_acts",
      title: "Republic Act No. 7610 - Special Protection of Children Against Abuse, Exploitation and Discrimination Act",
      number: "R.A. No. 7610",
      date: new Date("1992-06-17"),
      summary: "An Act Providing for Stronger Deterrence and Special Protection Against Child Abuse, Exploitation and Discrimination, and for Other Purposes. Provides comprehensive protection for children against all forms of abuse.",
    },
    {
      category: "laws",
      subcategory: "republic_acts",
      title: "Republic Act No. 9262 - Anti-Violence Against Women and Their Children Act of 2004",
      number: "R.A. No. 9262",
      date: new Date("2004-03-08"),
      summary: "An Act Defining Violence Against Women and Their Children, Providing for Protective Measures for Victims, Prescribing Penalties Therefor, and for Other Purposes. Covers physical, sexual, psychological, and economic abuse.",
    },
    {
      category: "laws",
      subcategory: "constitutions",
      title: "1987 Philippine Constitution",
      number: "Constitution",
      date: new Date("1987-02-02"),
      summary: "The fundamental law of the land, ratified by the Filipino people on February 2, 1987. It establishes the form of government, defines the rights and duties of citizens, and sets the framework for governance in the Philippines.",
      fullText: "PREAMBLE\n\nWe, the sovereign Filipino people, imploring the aid of Almighty God, in order to build a just and humane society, and establish a Government that shall embody our ideals and aspirations, promote the common good, conserve and develop our patrimony, and secure to ourselves and our posterity, the blessings of independence and democracy under the rule of law and a regime of truth, justice, freedom, love, equality, and peace, do ordain and promulgate this Constitution.",
    },
    {
      category: "laws",
      subcategory: "presidential_decree",
      title: "Presidential Decree No. 442 - Labor Code of the Philippines",
      number: "P.D. No. 442",
      date: new Date("1974-05-01"),
      summary: "The Labor Code of the Philippines prescribes the rules and standards for the protection of the rights of workers and their working conditions. It covers pre-employment, human resources development, labor relations, and post-employment matters.",
    },
    {
      category: "laws",
      subcategory: "acts",
      title: "Act No. 3815 - Revised Penal Code",
      number: "Act No. 3815",
      date: new Date("1930-12-08"),
      summary: "The Revised Penal Code of the Philippines, as amended, defines crimes and offenses and prescribes penalties. It is one of the cornerstones of Philippine criminal law.",
    },
  ];

  // --- Executive Issuances ---
  const executiveDocs = [
    {
      category: "executive_issuances",
      subcategory: "executive_orders",
      title: "Executive Order No. 292 - Administrative Code of 1987",
      number: "E.O. No. 292",
      date: new Date("1987-07-25"),
      summary: "The Revised Administrative Code of 1987 provides for the organization of the national government, defines the powers and functions of government agencies, and establishes administrative procedures.",
    },
    {
      category: "executive_issuances",
      subcategory: "executive_orders",
      title: "Executive Order No. 209 - Family Code of the Philippines",
      number: "E.O. No. 209",
      date: new Date("1987-07-06"),
      summary: "The Family Code of the Philippines governs marriage, legal separation, rights and obligations between husband and wife, property relations, family, paternity and filiation, adoption, support, parental authority, and rules on surnames.",
    },
    {
      category: "executive_issuances",
      subcategory: "administrative_orders",
      title: "Administrative Order No. 25 - Implementing the Ease of Doing Business Act",
      number: "A.O. No. 25",
      date: new Date("2020-02-15"),
      summary: "Rules and regulations implementing Republic Act No. 11032, otherwise known as the Ease of Doing Business and Efficient Government Service Delivery Act of 2018.",
    },
    {
      category: "executive_issuances",
      subcategory: "presidential_proclamations",
      title: "Proclamation No. 1081 - Declaring Martial Law",
      number: "Proc. No. 1081",
      date: new Date("1972-09-21"),
      summary: "President Ferdinand E. Marcos declared Martial Law throughout the Philippines. This proclamation placed the entire country under martial law, suspending civil liberties and fundamental rights.",
    },
  ];

  // --- References ---
  const referenceDocs = [
    {
      category: "references",
      subcategory: "benchbooks",
      title: "Philippine Judicial Academy Benchbook for Trial Courts",
      summary: "A comprehensive reference guide for trial court judges in the Philippines covering procedures, rules of evidence, and judicial conduct standards.",
    },
    {
      category: "references",
      subcategory: "sc_stylebook",
      title: "Supreme Court Stylebook First Edition",
      summary: "The official stylebook of the Supreme Court of the Philippines providing guidelines on legal citation, formatting, and writing style for court documents and decisions.",
    },
  ];

  // --- Treaties ---
  const treatyDocs = [
    {
      category: "treaties",
      subcategory: "bilateral",
      title: "Philippines-Japan Economic Partnership Agreement (JPEPA)",
      date: new Date("2008-12-11"),
      summary: "Bilateral economic partnership agreement between the Republic of the Philippines and Japan, covering trade in goods, services, investments, movement of natural persons, intellectual property, and dispute settlement.",
    },
    {
      category: "treaties",
      subcategory: "regional",
      title: "ASEAN Free Trade Area (AFTA) Agreement",
      date: new Date("1992-01-28"),
      summary: "The ASEAN Free Trade Area agreement aims to increase ASEAN's competitive edge as a production base in the world market through the elimination of tariffs and non-tariff barriers among ASEAN member states.",
    },
  ];

  const allDocs = [
    ...supremeCourtDocs,
    ...lawsDocs,
    ...executiveDocs,
    ...referenceDocs,
    ...treatyDocs,
  ];

  for (const doc of allDocs) {
    await prisma.legalDocument.create({ data: doc });
  }
  console.log(`✅ Created ${allDocs.length} legal documents`);

  // --- Document Templates ---
  const templates = [
    {
      name: "Complaint for Sum of Money",
      description: "A complaint seeking payment of a monetary obligation based on contract, quasi-contract, or other legal obligation.",
      category: "civil",
      type: "Complaint",
      content: JSON.stringify({
        ops: [
          { insert: "REPUBLIC OF THE PHILIPPINES\n", attributes: { bold: true, align: "center" } },
          { insert: "REGIONAL TRIAL COURT\n", attributes: { bold: true, align: "center" } },
          { insert: "Branch ___\n\n", attributes: { align: "center" } },
          { insert: "[PLAINTIFF NAME],\n            Plaintiff,\n\n    -versus-                    Civil Case No. ___\n                                For: SUM OF MONEY\n[DEFENDANT NAME],\n            Defendant.\nx----------------------------x\n\n" },
          { insert: "COMPLAINT\n\n", attributes: { bold: true, align: "center" } },
          { insert: "COMES NOW, the plaintiff, by the undersigned counsel, and unto this Honorable Court, most respectfully alleges:\n\n" },
          { insert: "1. That plaintiff is of legal age, Filipino citizen, and a resident of ___;\n\n" },
          { insert: "2. That defendant is of legal age, Filipino citizen, and may be served with summons and other court processes at ___;\n\n" },
          { insert: "3. [State the facts constituting the cause of action]\n\n" },
          { insert: "PRAYER\n\n", attributes: { bold: true } },
          { insert: "WHEREFORE, premises considered, plaintiff respectfully prays that judgment be rendered:\n\na) Ordering the defendant to pay the plaintiff ___;\nb) Ordering the defendant to pay attorney's fees;\nc) Costs of suit;\nd) Such other relief as may be deemed just and equitable.\n\n" },
        ],
      }),
    },
    {
      name: "Affidavit of Desistance",
      description: "A sworn statement by a complainant withdrawing the complaint and expressing disinterest in pursuing the case.",
      category: "criminal",
      type: "Affidavit",
      content: JSON.stringify({
        ops: [
          { insert: "REPUBLIC OF THE PHILIPPINES)\n", attributes: { bold: true } },
          { insert: "CITY/MUNICIPALITY OF ___     ) S.S.\n\n" },
          { insert: "AFFIDAVIT OF DESISTANCE\n\n", attributes: { bold: true, align: "center" } },
          { insert: "I, ___, of legal age, Filipino citizen, and a resident of ___, after having been duly sworn to in accordance with law, do hereby depose and state:\n\n" },
          { insert: "1. That I am the private complainant in [Case No.] for [offense] filed against [respondent];\n\n" },
          { insert: "2. That I am executing this Affidavit of Desistance of my own free will and volition, without force, intimidation, or any undue influence;\n\n" },
          { insert: "3. That I am no longer interested in pursuing said case against the respondent;\n\n" },
          { insert: "IN WITNESS WHEREOF, I have hereunto set my hand this ___ day of ___, 20___, at ___.\n\n" },
        ],
      }),
    },
    {
      name: "Motion for Reconsideration",
      description: "A motion filed to request the court to re-examine its ruling or decision on a particular matter.",
      category: "civil",
      type: "Motion for Reconsideration",
      content: JSON.stringify({
        ops: [
          { insert: "REPUBLIC OF THE PHILIPPINES\n", attributes: { bold: true, align: "center" } },
          { insert: "REGIONAL TRIAL COURT\n", attributes: { bold: true, align: "center" } },
          { insert: "Branch ___\n\n", attributes: { align: "center" } },
          { insert: "MOTION FOR RECONSIDERATION\n\n", attributes: { bold: true, align: "center" } },
          { insert: "COMES NOW, the [plaintiff/defendant], by the undersigned counsel, and unto this Honorable Court, most respectfully moves for the reconsideration of the [Order/Decision/Resolution] dated ___, on the following grounds:\n\n" },
          { insert: "I. THE HONORABLE COURT ERRED IN [STATE THE ERROR]\n\n", attributes: { bold: true } },
          { insert: "[Explain the legal basis for reconsideration]\n\n" },
          { insert: "PRAYER\n\n", attributes: { bold: true } },
          { insert: "WHEREFORE, premises considered, movant respectfully prays that the aforesaid [Order/Decision/Resolution] be reconsidered and set aside, and a new one be issued [state the relief prayed for].\n\n" },
        ],
      }),
    },
    {
      name: "Non-Disclosure Agreement (NDA)",
      description: "A contract to protect confidential business information shared between parties.",
      category: "commercial",
      type: "Non-Disclosure Agreement",
      content: JSON.stringify({
        ops: [
          { insert: "NON-DISCLOSURE AGREEMENT\n\n", attributes: { bold: true, align: "center" } },
          { insert: "This Non-Disclosure Agreement (\"Agreement\") is entered into as of ___ (\"Effective Date\"), by and between:\n\n" },
          { insert: "[DISCLOSING PARTY], with address at ___ (\"Disclosing Party\"); and\n\n" },
          { insert: "[RECEIVING PARTY], with address at ___ (\"Receiving Party\").\n\n" },
          { insert: "WHEREAS, the Disclosing Party possesses certain confidential and proprietary information; and\n\n" },
          { insert: "WHEREAS, the Receiving Party desires to receive such information for the purpose of ___;\n\n" },
          { insert: "NOW, THEREFORE, in consideration of the mutual promises and covenants contained herein, the parties agree as follows:\n\n" },
          { insert: "1. DEFINITION OF CONFIDENTIAL INFORMATION\n", attributes: { bold: true } },
          { insert: "\"Confidential Information\" means any and all non-public information disclosed by the Disclosing Party...\n\n" },
        ],
      }),
    },
    {
      name: "Position Paper (Labor Case)",
      description: "A written statement of facts and legal arguments submitted in a labor case before the NLRC or Labor Arbiter.",
      category: "labor",
      type: "Position Paper",
      content: JSON.stringify({
        ops: [
          { insert: "REPUBLIC OF THE PHILIPPINES\n", attributes: { bold: true, align: "center" } },
          { insert: "NATIONAL LABOR RELATIONS COMMISSION\n", attributes: { bold: true, align: "center" } },
          { insert: "Regional Arbitration Branch No. ___\n\n", attributes: { align: "center" } },
          { insert: "POSITION PAPER\n(For the Complainant)\n\n", attributes: { bold: true, align: "center" } },
          { insert: "COMES NOW, the complainant, by the undersigned counsel, and unto this Honorable Office, most respectfully submits this Position Paper and alleges:\n\n" },
          { insert: "I. STATEMENT OF THE CASE\n\n", attributes: { bold: true } },
          { insert: "[Narrate the nature of the case]\n\n" },
          { insert: "II. STATEMENT OF FACTS\n\n", attributes: { bold: true } },
          { insert: "[State the material facts]\n\n" },
          { insert: "III. ISSUES\n\n", attributes: { bold: true } },
          { insert: "[Define the legal issues]\n\n" },
          { insert: "IV. ARGUMENTS/DISCUSSION\n\n", attributes: { bold: true } },
          { insert: "[Present legal arguments with citations]\n\n" },
          { insert: "V. PRAYER\n\n", attributes: { bold: true } },
          { insert: "WHEREFORE, premises considered, complainant respectfully prays that judgment be rendered in his/her favor.\n\n" },
        ],
      }),
    },
  ];

  for (const template of templates) {
    await prisma.template.create({ data: template });
  }
  console.log(`✅ Created ${templates.length} document templates`);

  // --- Demo User ---
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("demo123", 12);

  await prisma.user.upsert({
    where: { email: "demo@jusconsultus.ai" },
    update: {},
    create: {
      email: "demo@jusconsultus.ai",
      name: "Juan dela Cruz",
      firstName: "Juan",
      lastName: "dela Cruz",
      passwordHash: hash,
      role: "user",
      plan: "pro",
      searchesLeft: 500,
      purpose: "legal_work",
      userRole: "solo_practitioner",
      firmName: "Dela Cruz Law Office",
    },
  });
  console.log("✅ Created demo user (demo@jusconsultus.ai / demo123)");

  // --- Pro User ---
  const proHash = await bcrypt.hash("pro123", 12);
  await prisma.user.upsert({
    where: { email: "kdtuazon21@gmail.com" },
    update: {
      plan: "pro",
      searchesLeft: 99999,
      role: "admin",
    },
    create: {
      email: "kdtuazon21@gmail.com",
      name: "KD Tuazon",
      firstName: "KD",
      lastName: "Tuazon",
      passwordHash: proHash,
      role: "admin",
      plan: "pro",
      searchesLeft: 99999,
      purpose: "legal_work",
      userRole: "solo_practitioner",
    },
  });
  console.log("✅ Created pro user (kdtuazon21@gmail.com / pro123)");

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
