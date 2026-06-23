// Standardised list of common NUS undergraduate courses.
// Add more as needed — keep values consistent so filtering works.

export const NUS_COURSES = [
  // Computing
  "Computer Science",
  "Business Analytics",
  "Information Systems",
  "Information Security",
  "Computer Engineering",
  // Business
  "Business Administration",
  "Business Administration (Accountancy)",
  "Real Estate",
  // Engineering
  "Biomedical Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Industrial & Systems Engineering",
  "Mechanical Engineering",
  "Materials Science & Engineering",
  "Environmental Engineering",
  // Science
  "Life Sciences",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Statistics",
  "Data Science & Analytics",
  "Pharmacy",
  "Pharmaceutical Science",
  "Food Science & Technology",
  // FASS
  "Economics",
  "Psychology",
  "Political Science",
  "Sociology",
  "History",
  "English Literature",
  "Communications & New Media",
  "Geography",
  "Philosophy",
  "Social Work",
  // Others
  "Law",
  "Medicine",
  "Dentistry",
  "Nursing",
  "Architecture",
  "Industrial Design",
  "Music",
  "Data Science & Economics",
  "Philosophy, Politics & Economics (PPE)",
  "Environmental Studies",
  "Other",
] as const;

// Map a course to its faculty (for the faculty filter chips)
export const COURSE_TO_FACULTY: Record<string, string> = {
  "Computer Science": "Computing",
  "Business Analytics": "Computing",
  "Information Systems": "Computing",
  "Information Security": "Computing",
  "Computer Engineering": "Computing",
  "Business Administration": "Business",
  "Business Administration (Accountancy)": "Business",
  "Real Estate": "Business",
  "Biomedical Engineering": "Engineering",
  "Chemical Engineering": "Engineering",
  "Civil Engineering": "Engineering",
  "Electrical Engineering": "Engineering",
  "Industrial & Systems Engineering": "Engineering",
  "Mechanical Engineering": "Engineering",
  "Materials Science & Engineering": "Engineering",
  "Environmental Engineering": "Engineering",
  "Life Sciences": "Science",
  "Chemistry": "Science",
  "Physics": "Science",
  "Mathematics": "Science",
  "Statistics": "Science",
  "Data Science & Analytics": "Science",
  "Pharmacy": "Science",
  "Pharmaceutical Science": "Science",
  "Food Science & Technology": "Science",
  "Economics": "FASS",
  "Psychology": "FASS",
  "Political Science": "FASS",
  "Sociology": "FASS",
  "History": "FASS",
  "English Literature": "FASS",
  "Communications & New Media": "FASS",
  "Geography": "FASS",
  "Philosophy": "FASS",
  "Social Work": "FASS",
  "Law": "Law",
  "Medicine": "Medicine",
  "Dentistry": "Dentistry",
  "Nursing": "Nursing",
  "Architecture": "Design & Environment",
  "Industrial Design": "Design & Environment",
  "Music": "Music",
};

// Common abbreviations / alternate spellings -> standard course name.
// Used to make search forgiving and to normalise messy free-text data.
export const COURSE_ALIASES: Record<string, string> = {
  "cs": "Computer Science",
  "comp sci": "Computer Science",
  "compsci": "Computer Science",
  "computer sci": "Computer Science",
  "bza": "Business Analytics",
  "ba": "Business Analytics",
  "biz analytics": "Business Analytics",
  "business analytics": "Business Analytics",
  "is": "Information Systems",
  "infosys": "Information Systems",
  "info sys": "Information Systems",
  "infosec": "Information Security",
  "ceg": "Computer Engineering",
  "comp eng": "Computer Engineering",
  "bba": "Business Administration",
  "biz": "Business Administration",
  "business": "Business Administration",
  "acc": "Business Administration (Accountancy)",
  "accountancy": "Business Administration (Accountancy)",
  "accounting": "Business Administration (Accountancy)",
  "eee": "Electrical Engineering",
  "ee": "Electrical Engineering",
  "mech eng": "Mechanical Engineering",
  "me": "Mechanical Engineering",
  "civil": "Civil Engineering",
  "chem eng": "Chemical Engineering",
  "biomed": "Biomedical Engineering",
  "bme": "Biomedical Engineering",
  "ise": "Industrial & Systems Engineering",
  "life sci": "Life Sciences",
  "lsm": "Life Sciences",
  "ls": "Life Sciences",
  "chem": "Chemistry",
  "phys": "Physics",
  "math": "Mathematics",
  "maths": "Mathematics",
  "stats": "Statistics",
  "dsa": "Data Science & Analytics",
  "data sci": "Data Science & Analytics",
  "econs": "Economics",
  "econ": "Economics",
  "psych": "Psychology",
  "polsci": "Political Science",
  "pol sci": "Political Science",
  "soc": "Sociology",
  "comms": "Communications & New Media",
  "cnm": "Communications & New Media",
  "geog": "Geography",
  "philo": "Philosophy",
  "ppe": "Philosophy, Politics & Economics (PPE)",
  "law": "Law",
  "med": "Medicine",
  "medicine": "Medicine",
  "nursing": "Nursing",
  "arch": "Architecture",
  "pharm": "Pharmacy",
};

// Normalise any course string (typed or stored) to a standard course name.
// Falls back to the original (trimmed) value if no match is found.
export function normaliseCourse(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // Exact alias match
  if (COURSE_ALIASES[lower]) return COURSE_ALIASES[lower];

  // Exact standard-name match (case-insensitive)
  const exact = NUS_COURSES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  // Otherwise keep what they typed (capitalised as-is)
  return trimmed;
}

// For search: does this profile's course match the query, allowing for
// aliases and partial matches in both directions?
export function courseMatchesQuery(course: string | null, query: string): boolean {
  if (!query) return true;
  if (!course) return false;

  const q = query.trim().toLowerCase();
  const normalisedCourse = normaliseCourse(course).toLowerCase();
  const rawCourse = course.toLowerCase();

  // If the query is an alias, also match its expanded form
  const expandedQuery = (COURSE_ALIASES[q] ?? query).toLowerCase();

  return (
    normalisedCourse.includes(q) ||
    rawCourse.includes(q) ||
    normalisedCourse.includes(expandedQuery) ||
    rawCourse.includes(expandedQuery)
  );
}
