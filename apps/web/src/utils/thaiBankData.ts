export interface ThaiBankInfo {
  name: string;
  fullname: string;
  nameEN: string;
  symbol: string;
  icon: string;
  color: string;
}

export const thaiBankList: Record<string, ThaiBankInfo> = {
  KBANK: { name: "กสิกรไทย", fullname: "ธนาคารกสิกรไทย", nameEN: "Kasikorn Bank", symbol: "KBANK", icon: "/bank-logos/KBANK.png", color: "#1DA858" },
  SCB: { name: "ไทยพาณิชย์", fullname: "ธนาคารไทยพาณิชย์", nameEN: "Siam Commercial Bank", symbol: "SCB", icon: "/bank-logos/SCB.png", color: "#543186" },
  KTB: { name: "กรุงไทย", fullname: "ธนาคารกรุงไทย", nameEN: "Krungthai Bank", symbol: "KTB", icon: "/bank-logos/KTB.png", color: "#1DA8E6" },
  BBL: { name: "กรุงเทพ", fullname: "ธนาคารกรุงเทพ", nameEN: "Bangkok Bank", symbol: "BBL", icon: "/bank-logos/BBL.png", color: "#29449D" },
  BAY: { name: "กรุงศรีอยุธยา", fullname: "ธนาคารกรุงศรีอยุธยา", nameEN: "Krungsri Bank", symbol: "BAY", icon: "/bank-logos/BAY.png", color: "#FFD51C" },
  TTB: { name: "ทีเอ็มบีธนชาต", fullname: "ธนาคารทีเอ็มบีธนชาต", nameEN: "TMBThanachart Bank", symbol: "TTB", icon: "/bank-logos/TTB.png", color: "#0C55F2" },
  CIMB: { name: "ซีไอเอ็มบี", fullname: "ธนาคารซีไอเอ็มบี", nameEN: "CIMB Thai Bank", symbol: "CIMB", icon: "/bank-logos/CIMB.png", color: "#BD1325" },
  CITI: { name: "ซิตี้แบงก์", fullname: "ธนาคารซิตี้แบงก์", nameEN: "Citibank", symbol: "CITI", icon: "/bank-logos/CITI.png", color: "#003B70" },
  GHB: { name: "ธ.อ.ส.", fullname: "ธนาคารอาคารสงเคราะห์", nameEN: "GH Bank", symbol: "GHB", icon: "/bank-logos/GHB.png", color: "#FF8614" },
  GSB: { name: "ออมสิน", fullname: "ธนาคารออมสิน", nameEN: "Government Savings Bank", symbol: "GSB", icon: "/bank-logos/GSB.png", color: "#ED1891" },
  HSBC: { name: "เอชเอสบีซี", fullname: "ธนาคารเอชเอสบีซี", nameEN: "HSBC", symbol: "HSBC", icon: "/bank-logos/HSBC.png", color: "#DB0011" },
  IBANK: { name: "อิสลาม", fullname: "ธนาคารอิสลามแห่งประเทศไทย", nameEN: "Islamic Bank of Thailand", symbol: "IBANK", icon: "/bank-logos/IBANK.png", color: "#1F8B3F" },
  ICBC: { name: "ไอซีบีซี", fullname: "ธนาคารไอซีบีซี", nameEN: "ICBC Thai", symbol: "ICBC", icon: "/bank-logos/ICBC.png", color: "#C8161D" },
  KKP: { name: "เกียรตินาคิน", fullname: "ธนาคารเกียรตินาคินภัทร", nameEN: "Kiatnakin Phatra Bank", symbol: "KKP", icon: "/bank-logos/KKP.png", color: "#5A547C" },
  LHB: { name: "แลนด์ แอนด์ เฮ้าส์", fullname: "ธนาคารแลนด์ แอนด์ เฮ้าส์", nameEN: "LH Bank", symbol: "LHB", icon: "/bank-logos/LHB.png", color: "#727375" },
  TCRB: { name: "ไทยเครดิต", fullname: "ธนาคารไทยเครดิต", nameEN: "Thai Credit Bank", symbol: "TCRB", icon: "/bank-logos/TCRB.png", color: "#FF7813" },
  TISCO: { name: "ทิสโก้", fullname: "ธนาคารทิสโก้", nameEN: "Tisco Bank", symbol: "TISCO", icon: "/bank-logos/TISCO.png", color: "#267CBC" },
  UOB: { name: "ยูโอบี", fullname: "ธนาคารยูโอบี", nameEN: "United Overseas Bank", symbol: "UOB", icon: "/bank-logos/UOB.png", color: "#E41A26" },
  BAAC: { name: "ธ.ก.ส.", fullname: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", nameEN: "BAAC", symbol: "BAAC", icon: "/bank-logos/BAAC.png", color: "#CCA41C" },
  PROMPTPAY: { name: "พร้อมเพย์", fullname: "พร้อมเพย์", nameEN: "PromptPay", symbol: "PROMPTPAY", icon: "/bank-logos/PROMPTPAY.png", color: "#003B80" },
  TRUEMONEY: { name: "ทรูมันนี่", fullname: "ทรูมันนี่ วอลเล็ท", nameEN: "TrueMoney Wallet", symbol: "TRUEMONEY", icon: "/bank-logos/TRUEMONEY.png", color: "#F47920" },
};

export const thaiBankOptions = Object.entries(thaiBankList).map(([key, bank]) => ({
  value: key,
  label: bank.fullname,
  icon: bank.icon,
  color: bank.color,
  symbol: bank.symbol,
  nameEN: bank.nameEN,
}));

/** Find bank info by symbol, Thai name, or partial match */
export function findBankByName(bankName: string): ThaiBankInfo | undefined {
  if (!bankName) return undefined;
  const upper = bankName.toUpperCase().trim();
  const lower = bankName.toLowerCase().trim();
  if (thaiBankList[upper]) return thaiBankList[upper];
  const exact = Object.values(thaiBankList).find(
    (b) => b.name === bankName || b.fullname === bankName || b.nameEN.toLowerCase() === lower
  );
  if (exact) return exact;
  const cleaned = bankName.replace(/^ธ\.|^ธนาคาร/g, '').trim();
  return Object.values(thaiBankList).find((b) => {
    const names = [b.name, b.fullname, b.symbol.toLowerCase()];
    return names.some(n => n.includes(cleaned) || cleaned.includes(n.replace('ธนาคาร', '').trim()));
  });
}
