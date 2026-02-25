import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Philippine legal database references for document research
const LEGAL_REFERENCES = [
  {
    title: "Civil Code of the Philippines",
    number: "R.A. No. 386",
    category: "civil",
    keywords: ["civil", "contract", "obligation", "property", "family", "damages", "lease", "sale", "mortgage", "quasi-delict"],
    summary:
      "Primary source of civil law in the Philippines, governing obligations, contracts, property, family relations, and succession.",
  },
  {
    title: "Rules of Court (2019 Amendments)",
    number: "A.M. No. 19-10-20-SC",
    category: "procedure",
    keywords: ["rules", "court", "procedure", "pleading", "motion", "evidence", "appeal", "complaint", "answer"],
    summary:
      "Procedural rules governing litigation in Philippine courts, including civil procedure, criminal procedure, evidence, and special proceedings.",
  },
  {
    title: "Revised Penal Code",
    number: "Act No. 3815",
    category: "criminal",
    keywords: ["criminal", "crime", "felony", "penalty", "imprisonment", "affidavit", "estafa", "theft", "robbery"],
    summary:
      "Defines crimes and corresponding penalties in Philippine criminal law, including felonies punishable by imprisonment, fines, or both.",
  },
  {
    title: "Labor Code of the Philippines",
    number: "P.D. No. 442",
    category: "labor",
    keywords: ["labor", "employment", "employee", "employer", "wage", "termination", "separation", "NLRC", "DOLE"],
    summary:
      "Governs employment practices and labor relations, including hiring, wages, benefits, termination, and labor dispute resolution.",
  },
  {
    title: "Corporation Code (Revised)",
    number: "R.A. No. 11232",
    category: "corporate",
    keywords: ["corporation", "board", "director", "shareholder", "resolution", "incorporation", "bylaws", "SEC"],
    summary:
      "Governs the formation, organization, and dissolution of private corporations in the Philippines.",
  },
  {
    title: "Real Estate Service Act",
    number: "R.A. No. 9646",
    category: "real_estate",
    keywords: ["real estate", "deed", "sale", "property", "land", "title", "lot", "transfer", "registry"],
    summary:
      "Governs the practice of real estate service in the Philippines, including registration of properties and licensed practitioners.",
  },
  {
    title: "Data Privacy Act of 2012",
    number: "R.A. No. 10173",
    category: "privacy",
    keywords: ["privacy", "data", "personal information", "NDA", "confidentiality", "NPC", "consent"],
    summary:
      "Protects individual personal information in information and communications systems, establishing the National Privacy Commission.",
  },
  {
    title: "Electronic Commerce Act",
    number: "R.A. No. 8792",
    category: "ecommerce",
    keywords: ["electronic", "digital", "signature", "contract", "online", "email", "ecommerce"],
    summary:
      "Recognizes electronic commercial transactions, contracts, and documents, providing legal validity to digital signatures and records.",
  },
  {
    title: "Intellectual Property Code",
    number: "R.A. No. 8293",
    category: "ip",
    keywords: ["intellectual property", "copyright", "trademark", "patent", "NDA", "confidential", "infringement"],
    summary:
      "Governs intellectual property rights in the Philippines, including copyright, trademark, patent, and trade secret protection.",
  },
  {
    title: "Efficient Use of Paper Rule",
    number: "A.M. No. 11-9-4-SC",
    category: "procedure",
    keywords: ["pleading", "format", "paper", "arial", "margin", "font", "legal size", "court document"],
    summary:
      "Mandates specific formatting requirements for all documents filed in court: Arial 14pt, legal size paper, specific margins.",
  },
  {
    title: "Anti-Graft and Corrupt Practices Act",
    number: "R.A. No. 3019",
    category: "administrative",
    keywords: ["graft", "corruption", "public officer", "sandiganbayan", "administrative", "complaint"],
    summary:
      "Penalizes corrupt practices by public officers and employees, with cases cognizable by the Sandiganbayan.",
  },
  {
    title: "Code of Professional Responsibility and Accountability",
    number: "A.M. No. 22-09-01-SC",
    category: "legal_ethics",
    keywords: ["attorney", "lawyer", "ethics", "disbarment", "counsel", "IBP", "legal profession"],
    summary:
      "Governs the professional conduct and responsibilities of lawyers in the Philippines.",
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const category = searchParams.get("category") || "";

    if (!query && !category) {
      return NextResponse.json({ results: LEGAL_REFERENCES.slice(0, 6) });
    }

    const results = LEGAL_REFERENCES.filter((ref) => {
      const matchesCategory = !category || ref.category === category;
      const matchesQuery =
        !query ||
        ref.title.toLowerCase().includes(query) ||
        ref.number.toLowerCase().includes(query) ||
        ref.summary.toLowerCase().includes(query) ||
        ref.keywords.some((kw) => kw.includes(query) || query.includes(kw));
      return matchesCategory && matchesQuery;
    });

    return NextResponse.json({ results: results.length > 0 ? results : LEGAL_REFERENCES.slice(0, 4) });
  } catch (error) {
    console.error("Document search error:", error);
    return NextResponse.json({ results: LEGAL_REFERENCES.slice(0, 4) });
  }
}
