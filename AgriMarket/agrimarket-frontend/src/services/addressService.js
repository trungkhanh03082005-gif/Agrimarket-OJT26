import axios from "axios";

const BASE_URL = "https://provinces.open-api.vn/api";
const BASE_URL_V2 = "https://provinces.open-api.vn/api/v2";

/**
 * -------------------------------------------------------------
 * 1. TỪ ĐIỂN SÁP NHẬP & BÍ DANH ĐƠN VỊ HÀNH CHÍNH VIỆT NAM (2024 - 2025)
 * Cập nhật các nghị quyết sắp xếp, sáp nhập ĐVHC cấp huyện, cấp xã
 * -------------------------------------------------------------
 */
const MERGED_GROUPS = [
  // --- TP. HỒ CHÍ MINH ---
  // Quận 3: P.9 và P.10 sáp nhập -> P.9; P.12 và P.14 sáp nhập -> P.14
  ["9", "10", "phuong 9", "phuong 10"],
  ["12", "14", "phuong 12", "phuong 14"],
  // Quận 4: P.1 và P.2 sáp nhập -> P.1; P.3 và P.4 sáp nhập -> P.3
  ["1", "2", "phuong 1", "phuong 2"],
  ["3", "4", "phuong 3", "phuong 4"],
  // Quận 5: P.2 và P.3 sáp nhập -> P.2; P.5 và P.6 sáp nhập -> P.5; P.7 và P.8 sáp nhập -> P.7
  ["5", "6", "phuong 5", "phuong 6"],
  ["7", "8", "phuong 7", "phuong 8"],
  // Quận 6: P.2 và P.6 sáp nhập -> P.2
  ["2", "6", "phuong 2", "phuong 6"],
  // Quận 8: P.1, P.2, P.3 sáp nhập; P.8, P.9, P.10 sáp nhập
  ["1", "2", "3", "phuong 1", "phuong 2", "phuong 3"],
  ["8", "9", "10", "phuong 8", "phuong 9", "phuong 10"],
  // Quận 10: P.6 và P.7 sáp nhập -> P.6; P.5 và P.8 sáp nhập
  ["6", "7", "phuong 6", "phuong 7"],
  ["5", "8", "phuong 5", "phuong 8"],
  // Quận 11: P.1 và P.2; P.8 và P.11
  ["8", "11", "phuong 8", "phuong 11"],
  // Quận Phú Nhuận: P.11 và P.12 sáp nhập -> P.11; P.13 và P.14 sáp nhập
  ["11", "12", "phuong 11", "phuong 12"],
  ["13", "14", "phuong 13", "phuong 14"],
  // Quận Bình Thạnh: P.1 và P.3; P.15 và P.17
  ["1", "3", "phuong 1", "phuong 3"],
  ["15", "17", "phuong 15", "phuong 17"],
  // Quận Gò Vấp: P.1 và P.4; P.8 và P.9
  ["1", "4", "phuong 1", "phuong 4"],
  // TP. Thủ Đức (sáp nhập Quận 2, Quận 9, Quận Thủ Đức)
  ["thu duc", "quan 2", "quan 9", "quan thu duc", "thanh pho thu duc", "tp thu duc"],
  // Các thị xã lên thành phố
  ["ben cat", "thi xa ben cat", "thanh pho ben cat"],
  ["tan uyen", "thi xa tan uyen", "thanh pho tan uyen"],
  ["phu my", "thi xa phu my", "thanh pho phu my"],
  ["thuy nguyen", "huyen thuy nguyen", "thanh pho thuy nguyen"],
  ["dong trieu", "thi xa dong trieu", "thanh pho dong trieu"],
  ["go cong", "thi xa go cong", "thanh pho go cong"],

  // --- THỦ ĐÔ HÀ NỘI ---
  // Quận Đống Đa
  ["kham thien", "trung phung"],
  ["nga tu so", "thinh quang"],
  ["quoc tu giam", "van mieu"],
  ["phuong mai", "kim lien"],
  // Quận Ba Đình
  ["nguyen trung truc", "truc bach"],
  // Quận Hai Bà Trưng
  ["dong nhan", "dong mac"],
  ["cau den", "bach khoa", "thanh nhan"],
  // Quận Hoàn Kiếm
  ["hang bac", "hang dao"],

  // --- ĐÀ NẴNG ---
  ["hai chau 1", "hai chau 2", "hai chau"],
  ["phuoc ninh", "nam duong", "binh hien"],
  ["tam thuan", "xuan ha"],
  ["tan chinh", "chinh gian"],
  ["hoa thuan dong", "hoa cuong bac"],

  // --- TÊN TỈNH / THÀNH PHỐ VÀ VIẾT TẮT ---
  ["ho chi minh", "sai gon", "hcm", "tp hcm", "tp ho chi minh", "tphcm"],
  ["ha noi", "hn", "tp ha noi"],
  ["da nang", "tp da nang"],
  ["hai phong", "tp hai phong"],
  ["can tho", "tp can tho"],
  ["thua thien hue", "hue", "tp hue", "thanh pho hue"],
  ["ba ria vung tau", "vung tau", "brvt", "ba ria - vung tau"],
  ["dak lak", "dac lac", "daklak"],
  ["dak nong", "dac nong", "daknong"],
  ["bac kan", "bac can"],
];

/**
 * Lấy danh sách bí danh đã sáp nhập của một đơn vị hành chính
 */
export const getMergedUnitAliases = (normName) => {
  if (!normName) return [];
  const aliases = new Set();
  for (const group of MERGED_GROUPS) {
    if (group.includes(normName)) {
      for (const item of group) {
        if (item !== normName) {
          aliases.add(item);
        }
      }
    }
  }
  return Array.from(aliases);
};

/**
 * -------------------------------------------------------------
 * 2. CÁC HÀM GỌI API LẤY DANH MỤC HÀNH CHÍNH (PROVINCES / DISTRICTS / WARDS)
 * -------------------------------------------------------------
 */

// Cache trong bộ nhớ để không gọi lại API nhiều lần
let cachedProvinces = null;
const cachedDistricts = new Map();
const cachedWards = new Map();

/**
 * Lấy danh sách Tỉnh/Thành phố (hỗ trợ cache)
 */
export const getProvinces = async () => {
  if (cachedProvinces && cachedProvinces.length > 0) {
    return cachedProvinces;
  }
  try {
    const response = await axios.get(`${BASE_URL}/`);
    cachedProvinces = response.data || [];
    return cachedProvinces;
  } catch (error) {
    console.error("Error fetching provinces v1:", error);
    // Fallback sang v2 nếu v1 không phản hồi
    try {
      const resV2 = await axios.get(`${BASE_URL_V2}/p/`);
      return resV2.data || [];
    } catch (e2) {
      console.error("Error fetching fallback provinces v2:", e2);
      return [];
    }
  }
};

// --- QUY TẮC SÁP NHẬP PHƯỜNG / XÃ TRỰC TIẾP TRÊN DROPDOWN GIAO DIỆN ---
const WARD_MERGE_TRANSFORMS = [
  // ĐÀ NẴNG (Quận Hải Châu, Thanh Khê...)
  { match: ["hoa cuong bac", "hoa cuong nam"], newName: "Phường Hòa Cường", newCode: 20257 },
  { match: ["hai chau 1", "hai chau 2"], newName: "Phường Hải Châu", newCode: 20236 },
  { match: ["nam duong", "binh hien"], newName: "Phường Phước Ninh", mergeInto: "phuoc ninh" },
  { match: ["hoa thuan dong"], newName: "Phường Bình Thuận", mergeInto: "binh thuan" },
  { match: ["tam thuan", "xuan ha"], newName: "Phường Xuân Hà", newCode: 20209 },
  { match: ["chinh gian"], newName: "Phường Tân Chính", mergeInto: "tan chinh" },

  // TP. HỒ CHÍ MINH
  { match: ["phuong 10"], newName: "Phường 9", mergeInto: "9" },
  { match: ["phuong 12"], newName: "Phường 14", mergeInto: "14" },
  { match: ["phuong 2"], newName: "Phường 1", mergeInto: "1" },
  { match: ["phuong 4"], newName: "Phường 3", mergeInto: "3" },
  { match: ["phuong 3"], newName: "Phường 2", mergeInto: "2" },
  { match: ["phuong 6"], newName: "Phường 5", mergeInto: "5" },
  { match: ["phuong 8"], newName: "Phường 7", mergeInto: "7" },
  { match: ["phuong 7"], newName: "Phường 6", mergeInto: "6" },
  { match: ["phuong 11"], newName: "Phường 12", mergeInto: "12" },
  { match: ["phuong 14"], newName: "Phường 13", mergeInto: "13" },
  { match: ["phuong 17"], newName: "Phường 15", mergeInto: "15" },
  { match: ["phuong 9"], newName: "Phường 8", mergeInto: "8" },

  // HÀ NỘI
  { match: ["trung phung"], newName: "Phường Khâm Thiên", mergeInto: "kham thien" },
  { match: ["nga tu so"], newName: "Phường Thịnh Quang", mergeInto: "thinh quang" },
  { match: ["quoc tu giam"], newName: "Phường Văn Miếu", mergeInto: "van mieu" },
  { match: ["nguyen trung truc"], newName: "Phường Trúc Bạch", mergeInto: "truc bach" },
  { match: ["dong mac"], newName: "Phường Đồng Nhân", mergeInto: "dong nhan" },
  { match: ["cau den"], newName: "Phường Bách Khoa", mergeInto: "bach khoa" },
  { match: ["hang bac"], newName: "Phường Hàng Đào", mergeInto: "hang dao" },
];

const DISTRICT_RENAME_TRANSFORMS = [
  { match: ["thuy nguyen"], newName: "Thành phố Thủy Nguyên" },
  { match: ["ben cat"], newName: "Thành phố Bến Cát" },
  { match: ["tan uyen"], newName: "Thành phố Tân Uyên" },
  { match: ["dong trieu"], newName: "Thành phố Đông Triều" },
  { match: ["go cong"], newName: "Thành phố Gò Công" },
];

/**
 * Lấy danh sách Quận/Huyện theo mã Tỉnh/Thành (đã áp dụng sáp nhập & nâng cấp lên thành phố)
 */
export const getDistricts = async (provinceCode) => {
  if (!provinceCode) return [];
  const key = String(provinceCode);
  if (cachedDistricts.has(key)) {
    return cachedDistricts.get(key);
  }
  try {
    const response = await axios.get(`${BASE_URL}/p/${provinceCode}?depth=2`);
    const rawDists = response.data?.districts || [];
    
    // Áp dụng cập nhật tên huyện/thị xã lên Thành phố
    const transformedDists = rawDists.map((dist) => {
      const norm = normalizeName(dist.name);
      const match = DISTRICT_RENAME_TRANSFORMS.find((rule) =>
        rule.match.some((m) => norm === m || norm.includes(m))
      );
      if (match) {
        return { ...dist, name: match.newName };
      }
      return dist;
    });

    cachedDistricts.set(key, transformedDists);
    return transformedDists;
  } catch (error) {
    console.error(`Error fetching districts for province code ${provinceCode}:`, error);
    return [];
  }
};

/**
 * Lấy danh sách Xã/Phường theo mã Quận/Huyện
 * TỰ ĐỘNG GỘP VÀ LOẠI BỎ CÁC ĐƠN VỊ CŨ THEO NGHỊ QUYẾT SÁP NHẬP ĐỂ DROPDOWN HIỂN THỊ CHUẨN MỚI
 */
export const getWards = async (districtCode) => {
  if (!districtCode) return [];
  const key = String(districtCode);
  if (cachedWards.has(key)) {
    return cachedWards.get(key);
  }
  try {
    const response = await axios.get(`${BASE_URL}/d/${districtCode}?depth=2`);
    const rawWards = response.data?.wards || [];

    // Bộ xử lý sáp nhập phường/xã
    const resultMap = new Map();

    for (const ward of rawWards) {
      const norm = normalizeName(ward.name);

      // Tìm quy tắc sáp nhập tương ứng
      const rule = WARD_MERGE_TRANSFORMS.find((r) =>
        r.match.some((m) => norm === m || norm.endsWith(" " + m) || norm === normalizeName(m))
      );

      if (rule) {
        if (rule.mergeInto) {
          // Phường cũ này đã bị sáp nhập vào phường khác -> không hiển thị đơn vị cũ riêng lẻ nữa
          continue;
        } else if (rule.newName) {
          // Đã sáp nhập thành đơn vị hành chính mới
          resultMap.set(rule.newName, {
            ...ward,
            code: rule.newCode || ward.code,
            name: rule.newName,
          });
          continue;
        }
      }

      resultMap.set(ward.name, ward);
    }

    const transformedWards = Array.from(resultMap.values());
    cachedWards.set(key, transformedWards);
    return transformedWards;
  } catch (error) {
    console.error(`Error fetching wards for district code ${districtCode}:`, error);
    return [];
  }
};

/**
 * API V2: Tra cứu danh sách Tỉnh/Thành mới (34 tỉnh sau sáp nhập)
 */
export const getProvincesV2 = async () => {
  try {
    const res = await axios.get(`${BASE_URL_V2}/p/`);
    return res.data || [];
  } catch (err) {
    console.error("Error getProvincesV2:", err);
    return [];
  }
};

/**
 * API V2: Tra cứu Xã/Phường theo mã Tỉnh mới
 */
export const getWardsByProvinceV2 = async (provinceCode) => {
  if (!provinceCode) return [];
  try {
    const res = await axios.get(`${BASE_URL_V2}/w/?province=${provinceCode}`);
    return res.data || [];
  } catch (err) {
    console.error("Error getWardsByProvinceV2:", err);
    return [];
  }
};

/**
 * API V2: Tra cứu tự động tên xã mới từ tên xã cũ trước khi sáp nhập
 */
export const lookupLegacyWard = async (legacyName) => {
  if (!legacyName) return null;
  try {
    const res = await axios.get(`${BASE_URL_V2}/w/from-legacy/?legacy_name=${encodeURIComponent(legacyName)}`);
    if (res.data && res.data.length > 0) {
      return res.data[0].ward;
    }
  } catch (err) {
    console.warn("Legacy ward lookup failed:", err);
  }
  return null;
};

/**
 * -------------------------------------------------------------
 * 3. HÀM CHUẨN HÓA & SO KHỚP ĐỊA DANH THÔNG MINH (FUZZY & MERGE AWARE)
 * -------------------------------------------------------------
 */

/**
 * Chuẩn hóa tên đơn vị hành chính:
 * - Chuyển chữ thường, bỏ dấu tiếng Việt (NFD)
 * - Xóa sạch các tiền tố hành chính: thành phố, tp., tp, tỉnh, thị xã, tx., tx, quận, q., q, huyện, h., h, phường, p., p, xã, x., x, thị trấn, tt., tt
 * - Chuển số La Mã (I, II, III, IV...) sang số Ả Rập (1, 2, 3, 4...)
 * - Bỏ số 0 đứng trước (01 -> 1, 09 -> 9)
 * - Xóa ký tự phân tách lạ
 */
export const normalizeName = (name) => {
  if (!name) return "";
  let str = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/đ/g, "d")
    .replace(/[.,\-_/()]/g, " ");

  // Xóa các tiền tố hành chính (kể cả có dấu chấm hay viết tắt)
  str = str
    .replace(/\b(thanh pho|tp|tinh|thi xa|tx|quan|q|huyen|h|phuong|p|xa|x|thi tran|tt)\b/gi, "")
    .trim();

  // Chuyển đổi số La Mã sang số thường
  str = str
    .replace(/\b(xii)\b/gi, "12")
    .replace(/\b(xi)\b/gi, "11")
    .replace(/\b(x)\b/gi, "10")
    .replace(/\b(ix)\b/gi, "9")
    .replace(/\b(viii)\b/gi, "8")
    .replace(/\b(vii)\b/gi, "7")
    .replace(/\b(vi)\b/gi, "6")
    .replace(/\b(iv)\b/gi, "4")
    .replace(/\b(v)\b/gi, "5")
    .replace(/\b(iii)\b/gi, "3")
    .replace(/\b(ii)\b/gi, "2")
    .replace(/\b(i)\b/gi, "1");

  // Bỏ số 0 đứng trước: '01' -> '1'
  str = str.replace(/\b0+(\d+)\b/g, "$1");

  // Xóa khoảng trắng thừa
  return str.replace(/\s+/g, " ").trim();
};

/**
 * Tìm đơn vị khớp nhất trong danh sách (Tỉnh, Huyện hoặc Xã):
 * Hỗ trợ:
 * 1. Khớp chính xác sau khi chuẩn hóa
 * 2. Khớp qua từ điển sáp nhập hành chính (Merged Units Mapping)
 * 3. Khớp theo số thứ tự (phường số, quận số)
 * 4. Khớp bao hàm (substring)
 */
export const findMatchingUnit = (unitList, candidateOrCandidates) => {
  if (!unitList || !unitList.length || !candidateOrCandidates) return null;

  const candidates = Array.isArray(candidateOrCandidates)
    ? candidateOrCandidates.filter(Boolean)
    : [candidateOrCandidates].filter(Boolean);

  if (candidates.length === 0) return null;

  // Tầng 1: So khớp chính xác sau khi chuẩn hóa
  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (!norm) continue;
    const match = unitList.find((item) => normalizeName(item.name) === norm);
    if (match) return match;
  }

  // Tầng 2: So khớp qua từ điển sáp nhập (Merged Units Mapping)
  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (!norm) continue;
    const aliases = getMergedUnitAliases(norm);
    for (const alias of aliases) {
      const match = unitList.find((item) => normalizeName(item.name) === alias);
      if (match) return match;
    }
  }

  // Tầng 3: So khớp theo số (cho các phường 1, 2, 3...)
  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    const matchDigits = norm.match(/\b\d+\b/);
    if (matchDigits) {
      const numStr = matchDigits[0];
      const match = unitList.find((item) => {
        const itemDigits = normalizeName(item.name).match(/\b\d+\b/);
        return itemDigits && itemDigits[0] === numStr;
      });
      if (match) return match;
    }
  }

  // Tầng 4: So khớp bao hàm (Substring match)
  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (norm.length < 3) continue;
    const match = unitList.find((item) => {
      const itemNorm = normalizeName(item.name);
      return itemNorm.length >= 3 && (itemNorm.includes(norm) || norm.includes(itemNorm));
    });
    if (match) return match;
  }

  return null;
};

/**
 * -------------------------------------------------------------
 * 4. HÀM TÁCH & GHÉP CHUỖI ĐỊA CHỈ (PARSE & FORMAT)
 * -------------------------------------------------------------
 */

/**
 * Tách chuỗi địa chỉ thành các thành phần: street, ward, district, province
 * Tự động thích ứng cả địa chỉ 3 cấp (cũ) và 2 cấp (mới sau sáp nhập)
 */
export const parseAddress = (addressStr) => {
  if (!addressStr || addressStr === "Chưa cập nhật" || addressStr === "Not updated") {
    return { street: "", ward: "", district: "", province: "" };
  }

  const parts = addressStr.split(",").map((part) => part.trim());

  if (parts.length >= 4) {
    const province = parts[parts.length - 1];
    const district = parts[parts.length - 2];
    const ward = parts[parts.length - 3];
    const street = parts.slice(0, parts.length - 3).join(", ");
    return { street, ward, district, province };
  } else if (parts.length === 3) {
    const province = parts[2];
    const district = parts[1];
    return { street: parts[0], ward: "", district, province };
  } else if (parts.length === 2) {
    const province = parts[1];
    return { street: parts[0], ward: "", district: "", province };
  } else {
    return { street: addressStr, ward: "", district: "", province: "" };
  }
};

/**
 * Ghép các thành phần thành chuỗi địa chỉ chuẩn
 */
export const formatAddress = ({ street, ward, district, province }) => {
  return [street, ward, district, province]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(", ");
};

/**
 * -------------------------------------------------------------
 * 5. TỌA ĐỘ TÂM CÁC TỈNH/THÀNH PHỐ TẠI VIỆT NAM
 * -------------------------------------------------------------
 */
export const PROVINCE_COORDINATES = {
  "ha noi": [21.0285, 105.8542],
  "hn": [21.0285, 105.8542],
  "ha giang": [22.8233, 104.9839],
  "cao bang": [22.6667, 106.25],
  "bac kan": [22.147, 105.8348],
  "bac can": [22.147, 105.8348],
  "tuyen quang": [21.8167, 105.2167],
  "lao cai": [22.4856, 103.9707],
  "dien bien": [21.385, 103.0178],
  "lai chau": [22.3956, 103.4608],
  "son la": [21.3256, 103.9189],
  "yen bai": [21.7167, 104.8667],
  "hoa binh": [20.8172, 105.3376],
  "thai nguyen": [21.5942, 105.8481],
  "lang son": [21.8537, 106.7615],
  "quang ninh": [20.95, 107.0833],
  "bac giang": [21.2731, 106.1946],
  "phu tho": [21.3167, 105.2167],
  "vinh phuc": [21.3089, 105.6049],
  "bac ninh": [21.1861, 106.0763],
  "hai duong": [20.9373, 106.3146],
  "hai phong": [20.8449, 106.6881],
  "hung yen": [20.6464, 106.0511],
  "thai binh": [20.45, 106.3333],
  "ha nam": [20.5833, 105.9167],
  "nam dinh": [20.4333, 106.1833],
  "ninh binh": [20.2539, 105.975],
  "thanh hoa": [19.8067, 105.7852],
  "nghe an": [18.6733, 105.6811],
  "ha tinh": [18.3559, 105.9058],
  "quang binh": [17.4833, 106.6],
  "quang tri": [16.8167, 107.1],
  "thua thien hue": [16.4637, 107.5909],
  "hue": [16.4637, 107.5909],
  "da nang": [16.0544, 108.2022],
  "quang nam": [15.5667, 108.4833],
  "quang ngai": [15.1167, 108.8],
  "binh dinh": [13.783, 109.2197],
  "phu yen": [13.0882, 109.3148],
  "khanh hoa": [12.2388, 109.1967],
  "ninh thuan": [11.5667, 108.9833],
  "binh thuan": [10.9805, 108.2615],
  "kon tum": [14.35, 108.0],
  "gia lai": [13.9833, 108.0],
  "dak lak": [12.6667, 108.0333],
  "dac lac": [12.6667, 108.0333],
  "daklak": [12.6667, 108.0333],
  "dak nong": [12.0042, 107.6908],
  "dac nong": [12.0042, 107.6908],
  "daknong": [12.0042, 107.6908],
  "lam dong": [11.9404, 108.4583],
  "binh phuoc": [11.7511, 106.9142],
  "tay ninh": [11.31, 106.1],
  "binh duong": [11.3254, 106.6946],
  "dong nai": [10.9574, 106.8427],
  "ba ria vung tau": [10.4114, 107.1362],
  "vung tau": [10.4114, 107.1362],
  "brvt": [10.4114, 107.1362],
  "ho chi minh": [10.8231, 106.6297],
  "sai gon": [10.8231, 106.6297],
  "hcm": [10.8231, 106.6297],
  "long an": [10.5333, 106.4],
  "tien giang": [10.35, 106.35],
  "ben tre": [10.2415, 106.3759],
  "tra vinh": [9.9333, 106.3333],
  "vinh long": [10.25, 105.9667],
  "dong thap": [10.2858, 105.6797],
  "an giang": [10.5216, 105.1259],
  "kien giang": [10.0125, 105.0809],
  "can tho": [10.0452, 105.7469],
  "hau giang": [9.7833, 105.4667],
  "soc trang": [9.6033, 105.98],
  "bac lieu": [9.2941, 105.7278],
  "ca mau": [9.1769, 105.1524],
};

/**
 * Tìm tọa độ tâm theo tên Tỉnh/Thành hoặc chuỗi địa chỉ
 */
export const getProvinceCoordinates = (nameOrAddress) => {
  if (!nameOrAddress) return null;
  const normalized = normalizeName(nameOrAddress);

  if (PROVINCE_COORDINATES[normalized]) {
    return PROVINCE_COORDINATES[normalized];
  }

  for (const [key, coords] of Object.entries(PROVINCE_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  return null;
};

/**
 * -------------------------------------------------------------
 * 6. ĐỊNH VỊ BẢN ĐỒ: FORWARD & REVERSE GEOCODING
 * -------------------------------------------------------------
 */

/**
 * Làm sạch chuỗi địa chỉ trước khi tìm kiếm bản đồ
 */
export const cleanAddressForSearch = (addressStr) => {
  if (!addressStr) return "";
  return addressStr
    .split(",")
    .map((part) => {
      return part
        .trim()
        .replace(/^(tinh|thanh pho|tp\.|quan|huyen|thi xa|tx\.|phuong|p\.|xa|thi tran|tt\.)\s+/gi, "")
        .trim();
    })
    .filter(Boolean)
    .join(", ");
};

/**
 * Tra cứu tọa độ từ chuỗi địa chỉ (Forward Geocoding)
 * Hỗ trợ tìm kiếm phân cấp thông minh:
 * 1. Tìm toàn bộ chuỗi
 * 2. Tìm chuỗi làm sạch
 * 3. Tìm cấp Tỉnh/Thành
 */
export const forwardGeocode = async (queryText) => {
  if (!queryText || !queryText.trim()) return null;

  const trySearch = async (text) => {
    // 1. Thử Photon (Komoot)
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          const coords = data.features[0].geometry?.coordinates;
          if (coords && coords.length >= 2) {
            return { lat: coords[1], lon: coords[0] };
          }
        }
      }
    } catch (err) {
      console.warn("Photon geocode warning:", err);
    }

    // 2. Fallback Nominatim OSM
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1&countrycodes=vn`,
        {
          headers: {
            "User-Agent": "AgriMarketStudentProject/2.0 (trungkhanh03082005@gmail.com)",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            return { lat, lon };
          }
        }
      }
    } catch (err) {
      console.warn("Nominatim geocode warning:", err);
    }

    return null;
  };

  // Thử 1: Nguyên chuỗi
  let result = await trySearch(queryText);
  if (result) return result;

  // Thử 2: Chuỗi làm sạch tiền tố
  const cleaned = cleanAddressForSearch(queryText);
  if (cleaned && cleaned !== queryText) {
    result = await trySearch(cleaned);
    if (result) return result;
  }

  // Thử 3: Fallback tọa độ tỉnh nếu có trong dictionary
  const coords = getProvinceCoordinates(queryText);
  if (coords) {
    return { lat: coords[0], lon: coords[1] };
  }

  return null;
};

/**
 * Tra cứu địa chỉ từ tọa độ (Reverse Geocoding)
 * Tự động tìm tên đường, số nhà, phường/xã, quận/huyện, tỉnh/thành phố khi ghim trên bản đồ.
 * Cung cấp mảng candidates đầy đủ (bao gồm cả các bí danh sáp nhập) để so khớp chính xác 100%.
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return null;

  let rawData = null;
  let streetName = "";
  let houseNo = "";
  let rawWard = "";
  let rawDistrict = "";
  let rawCity = "";
  let rawProvince = "";

  // 1. Thử Photon (Komoot)
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const prop = data.features[0].properties || {};
        streetName = prop.street || prop.name || "";
        houseNo = prop.housenumber || "";
        rawWard = prop.locality || prop.district || "";
        rawDistrict = prop.district || prop.suburb || prop.county || "";
        rawCity = prop.city || prop.state || "";
        rawProvince = prop.state || prop.city || "";
        rawData = prop;
      }
    }
  } catch (err) {
    console.warn("Photon reverse geocode error:", err);
  }

  // 2. Fallback Nominatim OSM (chính xác cao về phân cấp hành chính VN)
  if (!rawProvince || !rawDistrict) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
        {
          headers: {
            "User-Agent": "AgriMarketStudentProject/2.0 (trungkhanh03082005@gmail.com)",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          streetName = streetName || addr.road || addr.suburb || addr.neighbourhood || "";
          houseNo = houseNo || addr.house_number || "";
          rawWard =
            addr.quarter ||
            addr.suburb ||
            addr.village ||
            addr.town ||
            addr.neighbourhood ||
            addr.subdistrict ||
            addr.hamlet ||
            rawWard;
          rawDistrict =
            addr.district ||
            addr.city_district ||
            addr.county ||
            addr.town ||
            rawDistrict;
          rawCity = addr.city || rawCity;
          rawProvince = addr.province || addr.state || addr.city || rawProvince;
          rawData = addr;
        }
      }
    } catch (err) {
      console.warn("Nominatim reverse geocode error:", err);
    }
  }

  // 3. Fallback BigDataCloud client API
  if (!rawProvince && !rawWard) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`
      );
      if (res.ok) {
        const data = await res.json();
        if (data) {
          rawWard = data.locality || rawWard;
          rawDistrict =
            data.localityInfo?.administrative?.find((a) => a.adminLevel === 5 || a.adminLevel === 6)?.name ||
            rawDistrict;
          rawCity = data.city || data.principalSubdivision || rawCity;
          rawProvince = data.principalSubdivision || data.city || rawProvince;
          rawData = data;
        }
      }
    } catch (err) {
      console.warn("BigDataCloud reverse geocode error:", err);
    }
  }

  const streetValue =
    houseNo && streetName ? `${houseNo} ${streetName}` : streetName || houseNo || "";

  // Tạo danh sách candidates phong phú kèm các biến thể sáp nhập
  const normWard = normalizeName(rawWard);
  const wardAliases = getMergedUnitAliases(normWard);
  const wardCandidates = Array.from(
    new Set([rawWard, normWard, ...wardAliases, rawDistrict].filter(Boolean))
  );

  const normDist = normalizeName(rawDistrict);
  const distAliases = getMergedUnitAliases(normDist);
  const districtCandidates = Array.from(
    new Set([rawDistrict, normDist, ...distAliases, rawWard].filter(Boolean))
  );

  const normProv = normalizeName(rawProvince);
  const provAliases = getMergedUnitAliases(normProv);
  const provinceCandidates = Array.from(
    new Set([rawProvince, rawCity, normProv, ...provAliases].filter(Boolean))
  );

  return {
    street: streetValue,
    road: streetName,
    houseNumber: houseNo,
    ward: rawWard,
    district: rawDistrict,
    city: rawCity,
    province: rawProvince,
    wardCandidates,
    districtCandidates,
    provinceCandidates,
    raw: rawData,
  };
};
