import type { StateCode } from "../../config/states";

/** Site layout used to pick the placeholder imagery series (see prisma/demo-imagery.ts) */
export type SiteLayout = "building" | "road" | "linear" | "pond";

/** N = Not started, O = On-going, C = Completed, D = Delayed, S = Stalled */
type S = "N" | "O" | "C" | "D" | "S";

export type ProjectSeed = {
  district: string; // District.geoCode
  dept: string; // Department.code
  name: string;
  nameLocal?: string;
  budgetLakhs: number;
  /** Months before seed date that work started (negative = starts in future) */
  startedMonthsAgo: number;
  durationMonths: number;
  s: S;
  layout: SiteLayout;
};

const RJ: ProjectSeed[] = [
  // Jaipur
  { district: "RJ-JAIPUR", dept: "PWD", name: "District Hospital OPD Block, Sanganer", nameLocal: "जिला अस्पताल ओपीडी ब्लॉक, सांगानेर", budgetLakhs: 2450, startedMonthsAgo: 14, durationMonths: 24, s: "O", layout: "building" },
  { district: "RJ-JAIPUR", dept: "PWD", name: "Widening of Tonk Road (Durgapura–Sitapura)", budgetLakhs: 3800, startedMonthsAgo: 20, durationMonths: 18, s: "D", layout: "road" },
  { district: "RJ-JAIPUR", dept: "METRO", name: "Jaipur Metro Phase-2: Sitapura–Ambabari Corridor, Package 1", nameLocal: "जयपुर मेट्रो फेज-2: सीतापुरा–अंबाबाड़ी, पैकेज 1", budgetLakhs: 98000, startedMonthsAgo: 10, durationMonths: 48, s: "O", layout: "linear" },
  { district: "RJ-JAIPUR", dept: "METRO", name: "Jaipur Metro: Badi Chaupar Station Finishing Works", budgetLakhs: 4200, startedMonthsAgo: 30, durationMonths: 24, s: "C", layout: "building" },
  { district: "RJ-JAIPUR", dept: "DRAINAGE", name: "Sewer Line Laying, Jhotwara Zone", nameLocal: "सीवर लाइन बिछाना, झोटवाड़ा ज़ोन", budgetLakhs: 1650, startedMonthsAgo: 9, durationMonths: 15, s: "O", layout: "linear" },
  { district: "RJ-JAIPUR", dept: "DRAINAGE", name: "Storm Water Drain, Jawahar Circle to Malviya Nagar", budgetLakhs: 920, startedMonthsAgo: 16, durationMonths: 12, s: "S", layout: "linear" },
  { district: "RJ-JAIPUR", dept: "URBAN", name: "Affordable Housing Block (PMAY-U), Vidhyadhar Nagar", nameLocal: "किफायती आवास (पीएमएवाई-यू), विद्याधर नगर", budgetLakhs: 5400, startedMonthsAgo: 12, durationMonths: 24, s: "O", layout: "building" },
  { district: "RJ-JAIPUR", dept: "URBAN", name: "Walled City Bazaar Facade Restoration", budgetLakhs: 760, startedMonthsAgo: 22, durationMonths: 18, s: "C", layout: "building" },
  { district: "RJ-JAIPUR", dept: "RNB", name: "Flyover at Ajmer Road – Ring Road Junction", nameLocal: "अजमेर रोड–रिंग रोड जंक्शन फ्लाईओवर", budgetLakhs: 7600, startedMonthsAgo: 18, durationMonths: 24, s: "D", layout: "road" },
  { district: "RJ-JAIPUR", dept: "RNB", name: "Government Girls College Building, Chomu", budgetLakhs: 1150, startedMonthsAgo: 8, durationMonths: 14, s: "O", layout: "building" },
  { district: "RJ-JAIPUR", dept: "RURAL", name: "Panchayat Bhawan Construction, Bassi", nameLocal: "पंचायत भवन निर्माण, बस्सी", budgetLakhs: 85, startedMonthsAgo: 6, durationMonths: 8, s: "O", layout: "building" },
  { district: "RJ-JAIPUR", dept: "RURAL", name: "PMGSY Rural Road, Phagi–Renwal", budgetLakhs: 640, startedMonthsAgo: 15, durationMonths: 12, s: "C", layout: "road" },
  { district: "RJ-JAIPUR", dept: "MGNREGA", name: "Farm Pond Construction Cluster, Dudu Block", nameLocal: "खेत तलाई निर्माण, दूदू ब्लॉक", budgetLakhs: 48, startedMonthsAgo: 4, durationMonths: 6, s: "O", layout: "pond" },
  { district: "RJ-JAIPUR", dept: "MGNREGA", name: "Johad Revival, Amer", budgetLakhs: 32, startedMonthsAgo: 10, durationMonths: 6, s: "C", layout: "pond" },

  // Jodhpur
  { district: "RJ-JODHPUR", dept: "PWD", name: "Mathura Das Mathur Hospital Annex", nameLocal: "मथुरादास माथुर अस्पताल एनेक्सी", budgetLakhs: 3100, startedMonthsAgo: 16, durationMonths: 20, s: "O", layout: "building" },
  { district: "RJ-JODHPUR", dept: "DRAINAGE", name: "Jojari River STP Capacity Expansion", budgetLakhs: 4300, startedMonthsAgo: 19, durationMonths: 18, s: "D", layout: "pond" },
  { district: "RJ-JODHPUR", dept: "URBAN", name: "City Bus Depot, Pal Road", budgetLakhs: 980, startedMonthsAgo: 3, durationMonths: 12, s: "O", layout: "building" },
  { district: "RJ-JODHPUR", dept: "RNB", name: "Elevated Road, Jalori Gate to Sojati Gate", nameLocal: "एलिवेटेड रोड, जालोरी गेट से सोजती गेट", budgetLakhs: 23000, startedMonthsAgo: 11, durationMonths: 36, s: "O", layout: "road" },
  { district: "RJ-JODHPUR", dept: "RNB", name: "Bridge over Luni River, Salawas", budgetLakhs: 1850, startedMonthsAgo: 24, durationMonths: 18, s: "S", layout: "road" },
  { district: "RJ-JODHPUR", dept: "RURAL", name: "Anganwadi Centres (12 units), Osian Block", budgetLakhs: 140, startedMonthsAgo: 7, durationMonths: 9, s: "O", layout: "building" },
  { district: "RJ-JODHPUR", dept: "MGNREGA", name: "Tanka (Rainwater Cistern) Construction, Shergarh", nameLocal: "टांका निर्माण, शेरगढ़", budgetLakhs: 56, startedMonthsAgo: 5, durationMonths: 6, s: "O", layout: "pond" },

  // Udaipur
  { district: "RJ-UDAIPUR", dept: "PWD", name: "Collectorate Annex Building", budgetLakhs: 1250, startedMonthsAgo: 13, durationMonths: 18, s: "O", layout: "building" },
  { district: "RJ-UDAIPUR", dept: "DRAINAGE", name: "Lake Pichola Sewer Interception Line", nameLocal: "पिछोला झील सीवर इंटरसेप्शन लाइन", budgetLakhs: 2100, startedMonthsAgo: 17, durationMonths: 15, s: "D", layout: "linear" },
  { district: "RJ-UDAIPUR", dept: "URBAN", name: "Fatehsagar Lake Promenade Development", budgetLakhs: 1400, startedMonthsAgo: 9, durationMonths: 12, s: "O", layout: "road" },
  { district: "RJ-UDAIPUR", dept: "RNB", name: "Udaipur–Nathdwara Road Strengthening", budgetLakhs: 5600, startedMonthsAgo: 26, durationMonths: 24, s: "C", layout: "road" },
  { district: "RJ-UDAIPUR", dept: "RURAL", name: "Community Health Centre, Jhadol", nameLocal: "सामुदायिक स्वास्थ्य केंद्र, झाड़ोल", budgetLakhs: 690, startedMonthsAgo: 10, durationMonths: 14, s: "O", layout: "building" },
  { district: "RJ-UDAIPUR", dept: "MGNREGA", name: "Check Dam Series, Gogunda", budgetLakhs: 74, startedMonthsAgo: 8, durationMonths: 6, s: "D", layout: "pond" },

  // Kota
  { district: "RJ-KOTA", dept: "PWD", name: "Government Students' Hostel Complex, Kunhadi", nameLocal: "राजकीय छात्रावास परिसर, कुन्हाड़ी", budgetLakhs: 2750, startedMonthsAgo: 0, durationMonths: 18, s: "N", layout: "building" },
  { district: "RJ-KOTA", dept: "DRAINAGE", name: "Chambal Riverfront Drain Diversion", budgetLakhs: 1320, startedMonthsAgo: 12, durationMonths: 12, s: "O", layout: "linear" },
  { district: "RJ-KOTA", dept: "URBAN", name: "Riverfront Phase-2 Landscaping", budgetLakhs: 3500, startedMonthsAgo: 14, durationMonths: 18, s: "O", layout: "road" },
  { district: "RJ-KOTA", dept: "RNB", name: "Underpass at Anantpura Junction", budgetLakhs: 2200, startedMonthsAgo: 20, durationMonths: 16, s: "D", layout: "road" },
  { district: "RJ-KOTA", dept: "RURAL", name: "Rural Water Supply Overhead Tank, Ladpura", budgetLakhs: 210, startedMonthsAgo: 9, durationMonths: 10, s: "O", layout: "building" },
  { district: "RJ-KOTA", dept: "MGNREGA", name: "Plantation & Contour Trenching, Sangod", budgetLakhs: 40, startedMonthsAgo: 6, durationMonths: 8, s: "O", layout: "pond" },
];

const MH: ProjectSeed[] = [
  // Mumbai Suburban
  { district: "MH-MUMBAI-SUBURBAN", dept: "PWD", name: "Family Court Building Extension, Bandra", nameLocal: "कौटुंबिक न्यायालय इमारत विस्तार, वांद्रे", budgetLakhs: 3400, startedMonthsAgo: 15, durationMonths: 24, s: "O", layout: "building" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "METRO", name: "Metro Line 2B (DN Nagar–Mandale): Kurla Station Works", nameLocal: "मेट्रो मार्ग 2ब: कुर्ला स्थानक काम", budgetLakhs: 41000, startedMonthsAgo: 28, durationMonths: 36, s: "D", layout: "linear" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "METRO", name: "Metro Line 4: Ghatkopar Viaduct Segment", budgetLakhs: 36000, startedMonthsAgo: 22, durationMonths: 36, s: "O", layout: "linear" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "DRAINAGE", name: "Mithi River Widening & Retaining Wall, Kurla", nameLocal: "मिठी नदी रुंदीकरण व संरक्षक भिंत, कुर्ला", budgetLakhs: 6200, startedMonthsAgo: 18, durationMonths: 24, s: "O", layout: "linear" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "DRAINAGE", name: "Sewage Treatment Plant, Bhandup", budgetLakhs: 18500, startedMonthsAgo: 24, durationMonths: 30, s: "D", layout: "pond" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "URBAN", name: "SRA Rehabilitation Building, Malad (East)", budgetLakhs: 4800, startedMonthsAgo: 30, durationMonths: 24, s: "S", layout: "building" },
  { district: "MH-MUMBAI-SUBURBAN", dept: "RNB", name: "Gokhale Bridge Reconstruction, Andheri", nameLocal: "गोखले पूल पुनर्बांधणी, अंधेरी", budgetLakhs: 9500, startedMonthsAgo: 26, durationMonths: 24, s: "C", layout: "road" },

  // Pune
  { district: "MH-PUNE", dept: "PWD", name: "Sassoon Hospital New Wing", nameLocal: "ससून रुग्णालय नवीन इमारत", budgetLakhs: 5200, startedMonthsAgo: 12, durationMonths: 24, s: "O", layout: "building" },
  { district: "MH-PUNE", dept: "METRO", name: "Metro Line 3 (Hinjewadi–Shivajinagar): Balewadi Station", budgetLakhs: 12500, startedMonthsAgo: 30, durationMonths: 36, s: "O", layout: "linear" },
  { district: "MH-PUNE", dept: "METRO", name: "Swargate–Katraj Underground Extension, Launch Shaft", nameLocal: "स्वारगेट–कात्रज भूमिगत विस्तार", budgetLakhs: 29000, startedMonthsAgo: 5, durationMonths: 48, s: "O", layout: "building" },
  { district: "MH-PUNE", dept: "DRAINAGE", name: "Mula-Mutha Riverfront Sewer Interceptor", budgetLakhs: 7400, startedMonthsAgo: 16, durationMonths: 24, s: "O", layout: "linear" },
  { district: "MH-PUNE", dept: "URBAN", name: "Aundh–Baner Complete Streets", nameLocal: "औंध–बाणेर संपूर्ण रस्ते", budgetLakhs: 2300, startedMonthsAgo: 20, durationMonths: 15, s: "C", layout: "road" },
  { district: "MH-PUNE", dept: "RNB", name: "Chandni Chowk Interchange Improvement", budgetLakhs: 8600, startedMonthsAgo: 30, durationMonths: 24, s: "C", layout: "road" },
  { district: "MH-PUNE", dept: "RNB", name: "Pune Ring Road Package 4 (Urse–Shivare)", nameLocal: "पुणे रिंग रोड पॅकेज ४", budgetLakhs: 64000, startedMonthsAgo: 8, durationMonths: 36, s: "O", layout: "road" },
  { district: "MH-PUNE", dept: "RURAL", name: "Zilla Parishad School Buildings, Mulshi", budgetLakhs: 380, startedMonthsAgo: 11, durationMonths: 12, s: "D", layout: "building" },
  { district: "MH-PUNE", dept: "RURAL", name: "PMGSY Road, Velhe–Panshet", budgetLakhs: 920, startedMonthsAgo: 7, durationMonths: 12, s: "O", layout: "road" },
  { district: "MH-PUNE", dept: "MGNREGA", name: "Farm Ponds under Jalyukt Shivar, Baramati", nameLocal: "जलयुक्त शिवार शेततळी, बारामती", budgetLakhs: 64, startedMonthsAgo: 5, durationMonths: 6, s: "O", layout: "pond" },

  // Nagpur
  { district: "MH-NAGPUR", dept: "PWD", name: "GMC Super Speciality Block", budgetLakhs: 4600, startedMonthsAgo: 18, durationMonths: 24, s: "O", layout: "building" },
  { district: "MH-NAGPUR", dept: "METRO", name: "Nagpur Metro Phase-2: Kanhan Extension", nameLocal: "नागपूर मेट्रो टप्पा-२: कन्हान विस्तार", budgetLakhs: 27000, startedMonthsAgo: 14, durationMonths: 42, s: "O", layout: "linear" },
  { district: "MH-NAGPUR", dept: "DRAINAGE", name: "Nag River Pollution Abatement – Sewer Network", budgetLakhs: 9800, startedMonthsAgo: 22, durationMonths: 30, s: "D", layout: "linear" },
  { district: "MH-NAGPUR", dept: "URBAN", name: "Futala Lake Precinct Development", budgetLakhs: 1800, startedMonthsAgo: 13, durationMonths: 12, s: "C", layout: "road" },
  { district: "MH-NAGPUR", dept: "RNB", name: "Double-Decker Flyover, Wardha Road Extension", budgetLakhs: 15000, startedMonthsAgo: 10, durationMonths: 30, s: "O", layout: "road" },
  { district: "MH-NAGPUR", dept: "RURAL", name: "Gram Panchayat Office, Kamptee", nameLocal: "ग्रामपंचायत कार्यालय, कामठी", budgetLakhs: 70, startedMonthsAgo: 0, durationMonths: 8, s: "N", layout: "building" },
  { district: "MH-NAGPUR", dept: "MGNREGA", name: "Well Recharge & Farm Bunding, Katol", budgetLakhs: 38, startedMonthsAgo: 6, durationMonths: 6, s: "O", layout: "pond" },

  // Nashik
  { district: "MH-NASHIK", dept: "PWD", name: "Kumbh Mela 2027: Ghat Strengthening, Ramkund", nameLocal: "कुंभमेळा २०२७: रामकुंड घाट मजबुतीकरण", budgetLakhs: 2600, startedMonthsAgo: 9, durationMonths: 12, s: "O", layout: "road" },
  { district: "MH-NASHIK", dept: "DRAINAGE", name: "Godavari Sewage Treatment Plant, Tapovan", budgetLakhs: 8800, startedMonthsAgo: 15, durationMonths: 18, s: "D", layout: "pond" },
  { district: "MH-NASHIK", dept: "URBAN", name: "Kumbh 2027: Sadhugram Infrastructure, Tapovan", nameLocal: "कुंभ २०२७: साधुग्राम पायाभूत सुविधा", budgetLakhs: 12000, startedMonthsAgo: 7, durationMonths: 12, s: "O", layout: "building" },
  { district: "MH-NASHIK", dept: "RNB", name: "Nashik–Trimbakeshwar Road Widening", budgetLakhs: 11000, startedMonthsAgo: 12, durationMonths: 15, s: "O", layout: "road" },
  { district: "MH-NASHIK", dept: "RURAL", name: "Primary Health Centre, Igatpuri", budgetLakhs: 450, startedMonthsAgo: 14, durationMonths: 12, s: "S", layout: "building" },
  { district: "MH-NASHIK", dept: "MGNREGA", name: "Cement Nala Bunds, Sinnar", nameLocal: "सिमेंट नाला बंधारे, सिन्नर", budgetLakhs: 52, startedMonthsAgo: 4, durationMonths: 6, s: "O", layout: "pond" },
  { district: "MH-NASHIK", dept: "MGNREGA", name: "Horticulture Plantation, Dindori", budgetLakhs: 28, startedMonthsAgo: 12, durationMonths: 8, s: "C", layout: "pond" },
];

export const PROJECTS: Record<StateCode, ProjectSeed[]> = { RJ, MH };
