import type { StateCode } from "../../config/states";

export type DistrictSeed = {
  /** Stable code, also stored as District.geoCode and matched against the GeoJSON */
  geoCode: string;
  name: string;
  nameLocal: string;
  /** Former / alternate names — useful when matching third-party GeoJSON files */
  aliases?: string[];
  /** Approximate district HQ coordinates (used to place demo projects) */
  center: [lat: number, lng: number];
};

/**
 * Rajasthan — 41 districts (as of the 28 Dec 2024 notification that abolished
 * 9 of the 17 districts created in 2023). Original 33 + 8 retained new districts.
 */
const RAJASTHAN: DistrictSeed[] = [
  { geoCode: "RJ-AJMER", name: "Ajmer", nameLocal: "अजमेर", center: [26.4499, 74.6399] },
  { geoCode: "RJ-ALWAR", name: "Alwar", nameLocal: "अलवर", center: [27.553, 76.6346] },
  { geoCode: "RJ-BALOTRA", name: "Balotra", nameLocal: "बालोतरा", center: [25.8325, 72.2408] },
  { geoCode: "RJ-BANSWARA", name: "Banswara", nameLocal: "बांसवाड़ा", center: [23.5461, 74.4349] },
  { geoCode: "RJ-BARAN", name: "Baran", nameLocal: "बारां", center: [25.1, 76.5167] },
  { geoCode: "RJ-BARMER", name: "Barmer", nameLocal: "बाड़मेर", center: [25.75, 71.3833] },
  { geoCode: "RJ-BEAWAR", name: "Beawar", nameLocal: "ब्यावर", center: [26.1011, 74.3205] },
  { geoCode: "RJ-BHARATPUR", name: "Bharatpur", nameLocal: "भरतपुर", center: [27.2152, 77.503] },
  { geoCode: "RJ-BHILWARA", name: "Bhilwara", nameLocal: "भीलवाड़ा", center: [25.3463, 74.6364] },
  { geoCode: "RJ-BIKANER", name: "Bikaner", nameLocal: "बीकानेर", center: [28.0229, 73.3119] },
  { geoCode: "RJ-BUNDI", name: "Bundi", nameLocal: "बूंदी", center: [25.4305, 75.6499] },
  { geoCode: "RJ-CHITTORGARH", name: "Chittorgarh", nameLocal: "चित्तौड़गढ़", aliases: ["Chittaurgarh"], center: [24.8887, 74.6269] },
  { geoCode: "RJ-CHURU", name: "Churu", nameLocal: "चूरू", center: [28.2924, 74.9626] },
  { geoCode: "RJ-DAUSA", name: "Dausa", nameLocal: "दौसा", center: [26.8932, 76.3375] },
  { geoCode: "RJ-DEEG", name: "Deeg", nameLocal: "डीग", center: [27.4719, 77.3277] },
  { geoCode: "RJ-DHOLPUR", name: "Dholpur", nameLocal: "धौलपुर", aliases: ["Dhaulpur"], center: [26.7025, 77.8934] },
  { geoCode: "RJ-DIDWANA-KUCHAMAN", name: "Didwana-Kuchaman", nameLocal: "डीडवाना-कुचामन", center: [27.4, 74.5667] },
  { geoCode: "RJ-DUNGARPUR", name: "Dungarpur", nameLocal: "डूंगरपुर", center: [23.8417, 73.7147] },
  { geoCode: "RJ-HANUMANGARH", name: "Hanumangarh", nameLocal: "हनुमानगढ़", center: [29.5818, 74.3294] },
  { geoCode: "RJ-JAIPUR", name: "Jaipur", nameLocal: "जयपुर", center: [26.9124, 75.7873] },
  { geoCode: "RJ-JAISALMER", name: "Jaisalmer", nameLocal: "जैसलमेर", center: [26.9157, 70.9083] },
  { geoCode: "RJ-JALORE", name: "Jalore", nameLocal: "जालोर", aliases: ["Jalor"], center: [25.3445, 72.6254] },
  { geoCode: "RJ-JHALAWAR", name: "Jhalawar", nameLocal: "झालावाड़", center: [24.5973, 76.1609] },
  { geoCode: "RJ-JHUNJHUNU", name: "Jhunjhunu", nameLocal: "झुंझुनूं", aliases: ["Jhunjhunun"], center: [28.1289, 75.3995] },
  { geoCode: "RJ-JODHPUR", name: "Jodhpur", nameLocal: "जोधपुर", center: [26.2389, 73.0243] },
  { geoCode: "RJ-KARAULI", name: "Karauli", nameLocal: "करौली", center: [26.4986, 77.0207] },
  { geoCode: "RJ-KHAIRTHAL-TIJARA", name: "Khairthal-Tijara", nameLocal: "खैरथल-तिजारा", center: [27.8, 76.6333] },
  { geoCode: "RJ-KOTA", name: "Kota", nameLocal: "कोटा", center: [25.2138, 75.8648] },
  { geoCode: "RJ-KOTPUTLI-BEHROR", name: "Kotputli-Behror", nameLocal: "कोटपूतली-बहरोड़", center: [27.7025, 76.1993] },
  { geoCode: "RJ-NAGAUR", name: "Nagaur", nameLocal: "नागौर", center: [27.2024, 73.7339] },
  { geoCode: "RJ-PALI", name: "Pali", nameLocal: "पाली", center: [25.7711, 73.3234] },
  { geoCode: "RJ-PHALODI", name: "Phalodi", nameLocal: "फलोदी", center: [27.1311, 72.3647] },
  { geoCode: "RJ-PRATAPGARH", name: "Pratapgarh", nameLocal: "प्रतापगढ़", center: [24.0316, 74.7787] },
  { geoCode: "RJ-RAJSAMAND", name: "Rajsamand", nameLocal: "राजसमंद", center: [25.0715, 73.8808] },
  { geoCode: "RJ-SALUMBAR", name: "Salumbar", nameLocal: "सलूम्बर", center: [24.1353, 74.0436] },
  { geoCode: "RJ-SAWAI-MADHOPUR", name: "Sawai Madhopur", nameLocal: "सवाई माधोपुर", center: [26.0173, 76.3529] },
  { geoCode: "RJ-SIKAR", name: "Sikar", nameLocal: "सीकर", center: [27.6094, 75.1399] },
  { geoCode: "RJ-SIROHI", name: "Sirohi", nameLocal: "सिरोही", center: [24.8852, 72.8574] },
  { geoCode: "RJ-SRI-GANGANAGAR", name: "Sri Ganganagar", nameLocal: "श्रीगंगानगर", aliases: ["Ganganagar"], center: [29.9038, 73.8772] },
  { geoCode: "RJ-TONK", name: "Tonk", nameLocal: "टोंक", center: [26.1665, 75.7885] },
  { geoCode: "RJ-UDAIPUR", name: "Udaipur", nameLocal: "उदयपुर", center: [24.5854, 73.7125] },
];

/** Maharashtra — 36 districts, using current official names. */
const MAHARASHTRA: DistrictSeed[] = [
  { geoCode: "MH-AHILYANAGAR", name: "Ahilyanagar", nameLocal: "अहिल्यानगर", aliases: ["Ahmednagar", "Ahmadnagar"], center: [19.0948, 74.748] },
  { geoCode: "MH-AKOLA", name: "Akola", nameLocal: "अकोला", center: [20.7002, 77.0082] },
  { geoCode: "MH-AMRAVATI", name: "Amravati", nameLocal: "अमरावती", center: [20.9374, 77.7796] },
  { geoCode: "MH-BEED", name: "Beed", nameLocal: "बीड", aliases: ["Bid"], center: [18.9891, 75.7601] },
  { geoCode: "MH-BHANDARA", name: "Bhandara", nameLocal: "भंडारा", center: [21.1669, 79.6508] },
  { geoCode: "MH-BULDHANA", name: "Buldhana", nameLocal: "बुलढाणा", aliases: ["Buldana"], center: [20.5293, 76.1842] },
  { geoCode: "MH-CHANDRAPUR", name: "Chandrapur", nameLocal: "चंद्रपूर", center: [19.9615, 79.2961] },
  { geoCode: "MH-CHHATRAPATI-SAMBHAJINAGAR", name: "Chhatrapati Sambhajinagar", nameLocal: "छत्रपती संभाजीनगर", aliases: ["Aurangabad"], center: [19.8762, 75.3433] },
  { geoCode: "MH-DHARASHIV", name: "Dharashiv", nameLocal: "धाराशिव", aliases: ["Osmanabad"], center: [18.1861, 76.0419] },
  { geoCode: "MH-DHULE", name: "Dhule", nameLocal: "धुळे", center: [20.9042, 74.7749] },
  { geoCode: "MH-GADCHIROLI", name: "Gadchiroli", nameLocal: "गडचिरोली", center: [20.1849, 79.9948] },
  { geoCode: "MH-GONDIA", name: "Gondia", nameLocal: "गोंदिया", aliases: ["Gondiya"], center: [21.4624, 80.221] },
  { geoCode: "MH-HINGOLI", name: "Hingoli", nameLocal: "हिंगोली", center: [19.7173, 77.1494] },
  { geoCode: "MH-JALGAON", name: "Jalgaon", nameLocal: "जळगाव", center: [21.0077, 75.5626] },
  { geoCode: "MH-JALNA", name: "Jalna", nameLocal: "जालना", center: [19.841, 75.8864] },
  { geoCode: "MH-KOLHAPUR", name: "Kolhapur", nameLocal: "कोल्हापूर", center: [16.705, 74.2433] },
  { geoCode: "MH-LATUR", name: "Latur", nameLocal: "लातूर", center: [18.4088, 76.5604] },
  { geoCode: "MH-MUMBAI-CITY", name: "Mumbai City", nameLocal: "मुंबई शहर", aliases: ["Mumbai"], center: [18.9388, 72.8354] },
  { geoCode: "MH-MUMBAI-SUBURBAN", name: "Mumbai Suburban", nameLocal: "मुंबई उपनगर", center: [19.1197, 72.8468] },
  { geoCode: "MH-NAGPUR", name: "Nagpur", nameLocal: "नागपूर", center: [21.1458, 79.0882] },
  { geoCode: "MH-NANDED", name: "Nanded", nameLocal: "नांदेड", center: [19.1383, 77.321] },
  { geoCode: "MH-NANDURBAR", name: "Nandurbar", nameLocal: "नंदुरबार", center: [21.3667, 74.2333] },
  { geoCode: "MH-NASHIK", name: "Nashik", nameLocal: "नाशिक", aliases: ["Nasik"], center: [19.9975, 73.7898] },
  { geoCode: "MH-PALGHAR", name: "Palghar", nameLocal: "पालघर", center: [19.6967, 72.7699] },
  { geoCode: "MH-PARBHANI", name: "Parbhani", nameLocal: "परभणी", center: [19.2704, 76.7601] },
  { geoCode: "MH-PUNE", name: "Pune", nameLocal: "पुणे", center: [18.5204, 73.8567] },
  { geoCode: "MH-RAIGAD", name: "Raigad", nameLocal: "रायगड", aliases: ["Raigarh"], center: [18.5158, 73.1822] },
  { geoCode: "MH-RATNAGIRI", name: "Ratnagiri", nameLocal: "रत्नागिरी", center: [16.9902, 73.312] },
  { geoCode: "MH-SANGLI", name: "Sangli", nameLocal: "सांगली", center: [16.8524, 74.5815] },
  { geoCode: "MH-SATARA", name: "Satara", nameLocal: "सातारा", center: [17.6805, 74.0183] },
  { geoCode: "MH-SINDHUDURG", name: "Sindhudurg", nameLocal: "सिंधुदुर्ग", center: [16.3492, 73.5594] },
  { geoCode: "MH-SOLAPUR", name: "Solapur", nameLocal: "सोलापूर", center: [17.6599, 75.9064] },
  { geoCode: "MH-THANE", name: "Thane", nameLocal: "ठाणे", center: [19.2183, 72.9781] },
  { geoCode: "MH-WARDHA", name: "Wardha", nameLocal: "वर्धा", center: [20.7453, 78.6022] },
  { geoCode: "MH-WASHIM", name: "Washim", nameLocal: "वाशिम", center: [20.1113, 77.1337] },
  { geoCode: "MH-YAVATMAL", name: "Yavatmal", nameLocal: "यवतमाळ", center: [20.3888, 78.1204] },
];

export const DISTRICTS: Record<StateCode, DistrictSeed[]> = {
  RJ: RAJASTHAN,
  MH: MAHARASHTRA,
};
