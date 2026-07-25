// NUS course list, faculty mapping, and forgiving search.
// courseMatchesQuery lets people type "CS" and match "Computer Science", etc.

export const NUS_COURSES = [
  "Computer Science",
  "Business Analytics",
  "Information Systems",
  "Information Security",
  "Business Artificial Intelligence Systems",
  "Computer Engineering",
  "Data Science and Analytics",
  "Business Administration",
  "Accountancy",
  "Economics",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Industrial and Systems Engineering",
  "Materials Science and Engineering",
  "Mathematics",
  "Applied Mathematics",
  "Statistics",
  "Physics",
  "Chemistry",
  "Life Sciences",
  "Pharmacy",
  "Pharmaceutical Science",
  "Medicine",
  "Nursing",
  "Dentistry",
  "Law",
  "Architecture",
  "Industrial Design",
  "Project and Facilities Management",
  "Real Estate",
  "Political Science",
  "Psychology",
  "Sociology",
  "History",
  "Geography",
  "English Literature",
  "English Language",
  "Communications and New Media",
  "Philosophy",
  "Social Work",
  "Chinese Studies",
  "Malay Studies",
  "South Asian Studies",
  "Global Studies",
  "Music",
  "Environmental Studies",
  "Food Science and Technology",
  "Data Science and Economics",
];

// Map each course to a faculty (used elsewhere if needed).
export const COURSE_TO_FACULTY: Record<string, string> = {
  "Computer Science": "Computing",
  "Business Analytics": "Computing",
  "Information Systems": "Computing",
  "Information Security": "Computing",
  "Computer Engineering": "Computing",
  "Data Science and Analytics": "Science",
  "Business Administration": "Business",
  "Accountancy": "Business",
  "Economics": "Arts & Social Sciences",
  "Mechanical Engineering": "Engineering",
  "Electrical Engineering": "Engineering",
  "Chemical Engineering": "Engineering",
  "Civil Engineering": "Engineering",
  "Biomedical Engineering": "Engineering",
  "Industrial and Systems Engineering": "Engineering",
  "Materials Science and Engineering": "Engineering",
  "Mathematics": "Science",
  "Applied Mathematics": "Science",
  "Statistics": "Science",
  "Physics": "Science",
  "Chemistry": "Science",
  "Life Sciences": "Science",
  "Pharmacy": "Science",
  "Pharmaceutical Science": "Science",
  "Medicine": "Medicine",
  "Nursing": "Medicine",
  "Dentistry": "Medicine",
  "Law": "Law",
  "Architecture": "Design & Environment",
  "Industrial Design": "Design & Environment",
  "Project and Facilities Management": "Design & Environment",
  "Real Estate": "Design & Environment",
  "Music": "Music",
};

// Common abbreviations / alternate spellings people might type.
// Keys are lowercase search terms, values are the canonical course name.
export const COURSE_ALIASES: Record<string, string> = {
  // ---- Computing (School of Computing) ----
  // Official module prefixes: CS, IS, BT, CP
  "cs": "Computer Science",
  "comp sci": "Computer Science",
  "compsci": "Computer Science",
  "comp science": "Computer Science",
  "is": "Information Systems",
  "infosys": "Information Systems",
  "info systems": "Information Systems",
  "isec": "Information Security",
  "infosec": "Information Security",
  "info security": "Information Security",
  "bt": "Business Analytics",       // BT is the official module prefix for Business Analytics
  "bza": "Business Analytics",      // BZA is the colloquial NUS programme abbreviation
  "biz analytics": "Business Analytics",
  "business analytics": "Business Analytics",
  "bais": "Business Artificial Intelligence Systems",
  "business ai": "Business Artificial Intelligence Systems",

  // ---- Business (NUS Business School) ----
  "bba": "Business Administration",
  "ba": "Business Administration",
  "biz": "Business Administration",
  "biz admin": "Business Administration",
  "business": "Business Administration",
  "acc": "Accountancy",
  "acct": "Accountancy",
  "accounting": "Accountancy",

  // ---- Engineering (College of Design and Engineering) ----
  "ceg": "Computer Engineering",    // official CEG programme code
  "comp eng": "Computer Engineering",
  "me": "Mechanical Engineering",
  "mech eng": "Mechanical Engineering",
  "mech": "Mechanical Engineering",
  "ee": "Electrical Engineering",   // EE is the official module prefix
  "elec eng": "Electrical Engineering",
  "cheme": "Chemical Engineering",
  "chem eng": "Chemical Engineering",
  "ce": "Civil Engineering",
  "civil eng": "Civil Engineering",
  "bme": "Biomedical Engineering",
  "biomed": "Biomedical Engineering",
  "ise": "Industrial and Systems Engineering",
  "mls": "Materials Science and Engineering",
  "mse": "Materials Science and Engineering",

  // ---- Science (Faculty of Science / CHS) ----
  "ma": "Mathematics",              // MA is the official module prefix
  "math": "Mathematics",
  "maths": "Mathematics",
  "am": "Applied Mathematics",
  "applied math": "Applied Mathematics",
  "st": "Statistics",               // ST is the official module prefix
  "stats": "Statistics",
  "dsa": "Data Science and Analytics",
  "data science": "Data Science and Analytics",
  "phy": "Physics",
  "phys": "Physics",
  "cm": "Chemistry",
  "chem": "Chemistry",
  "ls": "Life Sciences",
  "lsm": "Life Sciences",
  "life sci": "Life Sciences",
  "pharm": "Pharmacy",
  "fst": "Food Science and Technology",
  "food sci": "Food Science and Technology",

  // ---- Medicine ----
  "med": "Medicine",
  "mbbs": "Medicine",
  "nur": "Nursing",
  "nursing": "Nursing",
  "dent": "Dentistry",
  "dentistry": "Dentistry",

  // ---- Law ----
  "law": "Law",
  "llb": "Law",

  // ---- Design & Environment (CDE) ----
  "arch": "Architecture",
  "archi": "Architecture",
  "did": "Industrial Design",
  "id": "Industrial Design",
  "pfm": "Project and Facilities Management",
  "re": "Real Estate",

  // ---- Arts & Social Sciences (FASS / CHS) ----
  "econ": "Economics",
  "econs": "Economics",
  "ec": "Economics",
  "ps": "Political Science",
  "poli sci": "Political Science",
  "polsci": "Political Science",
  "psy": "Psychology",
  "psych": "Psychology",
  "psycho": "Psychology",
  "soc": "Sociology",
  "socio": "Sociology",
  "hist": "History",
  "geog": "Geography",
  "el": "English Language",
  "ell": "English Language",
  "en": "English Literature",
  "eng lit": "English Literature",
  "lit": "English Literature",
  "cnm": "Communications and New Media",
  "comms": "Communications and New Media",
  "phil": "Philosophy",
  "philo": "Philosophy",
  "sw": "Social Work",
  "socwork": "Social Work",
  "gl": "Global Studies",
  "global": "Global Studies",

  // ---- Music (YST) ----
  "mus": "Music",
  "music": "Music",

  // ---- Environment ----
  "ens": "Environmental Studies",
  "env": "Environmental Studies",
};

// Normalise a course string for comparison (lowercase, collapse spaces).
export function normaliseCourse(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Does a profile's course match what the user typed?
// Designed to be forgiving ("cs" finds Computer Science) without false
// positives ("cs" must NOT match Business Analytics just because
// "analytiCS" contains the letters "cs").
export function courseMatchesQuery(
  course: string | null | undefined,
  query: string
): boolean {
  const q = normaliseCourse(query);
  if (!q) return true;                // empty search shows everyone

  const c = normaliseCourse(course);
  if (!c) return false;               // profile has no course set

  const courseWords = c.split(" ");

  // 1. Any word in the course starts with the query.
  //    "comp" -> Computer Science, "econ" -> Economics, "analytics" -> Business Analytics.
  //    This deliberately avoids mid-word matches like "cs" inside "analytics".
  if (courseWords.some((w) => w.startsWith(q))) return true;

  // 2. Multi-word query: allow a full substring, which is specific enough
  //    to be safe. "data science" -> Data Science and Analytics.
  if (q.includes(" ") && c.includes(q)) return true;

  // 3. The query is a known abbreviation for this exact course.
  //    "cs" -> Computer Science, "ba" -> Business Analytics, "is" -> Information Systems.
  const aliasTarget = COURSE_ALIASES[q];
  if (aliasTarget && normaliseCourse(aliasTarget) === c) return true;

  // 4. Typing part of the full name that an alias expands to.
  if (aliasTarget) {
    const targetWords = normaliseCourse(aliasTarget).split(" ");
    if (targetWords.some((w) => w.startsWith(q))) return true;
  }

  return false;
}
