/**
 * PartnerAds — Premium partner showcase
 * Small, elegant, horizontal scroll on mobile / grid on desktop
 */
import { useState } from 'react';
import { ExternalLink, Instagram, Mail, MapPin, Phone, X } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  tagline: string;
  description: string;
  logo: string;
  promote: string;
  address?: string;
  phone: string;
  facebook: string;
  tags: string[];
  location: string;
  instagram?: string;
  instagramLabel?: string;
  email?: string;
  serviceArea?: string;
}

const PARTNERS: Partner[] = [
  {
    id: 'henry',
    name: 'Henry and Co',
    tagline: 'เฟอร์นิเจอร์',
    description: 'สร้างสรรค์เฟอร์นิเจอร์จากประสบการณ์ และความพิถีพิถันด้วยวัสดุคุณภาพ',
    logo: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FHenry%20and%20Co%20Furniture%20logo.jpg?alt=media&token=43823b4f-d6a7-43d7-a1e0-efa65d3e4db6',
    promote: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FHenry%20and%20Co%20Furniture%20promote.jpg?alt=media&token=a81c2341-2e8c-45da-bba0-b9025e287ab6',
    address: '18/201 ถนนเลียบคลอง 4 ซอย 5 ซอยเบญจญานี ตำบลลาดสวาย อำเภอลำลูกกา',
    phone: '097-046-7330',
    facebook: 'https://www.facebook.com/henryandcofurniture',
    tags: ['Furniture', 'Custom Made', 'Craftsman'],
    location: 'ลำลูกกา, ปทุมธานี',
  },
  {
    id: 'thardware',
    name: 'ที.ฮาร์ดแวร์',
    tagline: 'เครื่องมือช่าง ศูนย์ผสมสี วัสดุก่อสร้าง เพชรบุรี',
    description: 'ตัวแทนจำหน่ายเครื่องมือช่างอย่างเป็นทางการ Milwaukee, Pumpkin, Dewalt, Osuka, Bosch, Makita',
    logo: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FT%20hardware%20logo.jpg?alt=media&token=da3d7184-af9a-4eeb-85de-58aee2f2c516',
    promote: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FT%20hardware%20promote.jpg?alt=media&token=5052f0d4-4af6-4e8a-87f7-720984a92fae',
    address: '157/29-32 ต.ท่ายาง อ.ท่ายาง จ.เพชรบุรี 76130',
    phone: '098-354-0444',
    facebook: 'https://www.facebook.com/t.hardwarephet',
    tags: ['Tools', 'Paint Mixing', 'Construction'],
    location: 'ท่ายาง, เพชรบุรี',
    serviceArea: 'Hua Hin, Prachuap Khiri Khan · Keng Kachan, Phetchaburi + 2',
  },
  {
    id: 'vanavard',
    name: 'Vanavard interior',
    tagline: 'Turnkey Service ครบวงจร',
    description: 'Turnkey Service ครบวงจร ตั้งแต่ออกแบบ วางแผน จัดการโครงการ ไปจนถึงการก่อสร้าง ตกแต่งภายใน และเฟอร์นิเจอร์ เพื่อให้งานออกมาสมบูรณ์แบบ ตรงความต้องการ และเสร็จทันเวลา',
    logo: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Fvanavard%20logo.jpg?alt=media&token=be5e4704-9d5b-4ad4-8d2b-fbae0ea79b2b',
    promote: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Fvanavard%20promote.jpg?alt=media&token=af3ed1e3-2e39-43b8-a728-f30c76f430da',
    phone: '093-329-9990',
    email: 'vanavard1@gmail.com',
    instagram: 'https://www.instagram.com/vanavard_interior',
    instagramLabel: '@vanavard_interior',
    facebook: 'https://www.facebook.com/VANAVARDOfficial',
    tags: ['Turnkey', 'Interior', 'Furniture'],
    location: 'Turnkey Interior',
  },
];

export function PartnerAds() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Partners</p>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 snap-x snap-mandatory scrollbar-hide">
        {PARTNERS.map((partner) => (
          <button
            key={partner.id}
            onClick={() => setExpanded(partner.id)}
            className="flex-shrink-0 w-[260px] md:w-auto snap-start group relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white hover:shadow-lg transition-all duration-300"
          >
            {/* Promote image */}
            <div className="relative h-[120px] overflow-hidden">
              <img
                src={partner.promote}
                alt={partner.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Logo badge */}
              <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="w-8 h-8 rounded-lg object-cover border-2 border-white/80 shadow-sm"
                  loading="lazy"
                />
                <div className="text-left">
                  <p className="text-xs font-bold text-white drop-shadow-sm leading-tight">{partner.name}</p>
                  <p className="text-[9px] text-white/80 drop-shadow-sm">{partner.tagline}</p>
                </div>
              </div>
            </div>

            {/* Info strip */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <MapPin className="w-2.5 h-2.5" />
                <span className="truncate">{partner.location}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded partner detail modal */}
      {expanded && (() => {
        const p = PARTNERS.find((x) => x.id === expanded);
        if (!p) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExpanded(null)} />
            <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
              {/* Hero */}
              <div className="relative h-48 sm:h-56">
                <img src={p.promote} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <button
                  onClick={() => setExpanded(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 text-white/90 hover:bg-black/50 transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-white/90 shadow-lg"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white drop-shadow-md">{p.name}</h3>
                      <p className="text-xs text-white/85 drop-shadow-sm">{p.tagline}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">{p.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Contact info */}
                <div className="space-y-2">
                  {p.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs">{p.address}</span>
                    </div>
                  )}
                  {p.serviceArea && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs">{p.serviceArea}</span>
                    </div>
                  )}
                  <a href={`tel:${p.phone.replace(/-/g, '')}`} className="flex items-center gap-2 text-sm text-blue-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{p.phone}</span>
                  </a>
                  {p.instagram && (
                    <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600">
                      <Instagram className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">{p.instagramLabel || p.instagram}</span>
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-blue-600">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">{p.email}</span>
                    </a>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={p.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  ดูเพิ่มเติมบน Facebook
                </a>
              </div>

              {/* Safe area bottom for mobile */}
              <div className="h-safe-area-inset-bottom" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
