import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import useStore from '../store/useStore';
import Modal from '../components/ui/Modal';

const ADMIN_ID = 6709001451;

// ─── Setting row ─────────────────────────────────────────────────────────────
interface SettingRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, iconBg, label, sub, right, onClick, href }) => {
  const inner = (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 bg-cyber-card border border-cyber-border rounded-2xl active:scale-[0.98] transition-all duration-150 cursor-pointer hover:border-cyber-purple/40"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-1 text-gray-500">
        {right}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>
  );

  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { language, telegramUser, setLanguage } = useStore();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const isUz = language === 'uz';
  const isAdmin = telegramUser?.id === ADMIN_ID;

  // Real user info
  const firstName   = telegramUser?.first_name ?? (isUz ? 'Foydalanuvchi' : 'User');
  const username    = telegramUser?.username ? `@${telegramUser.username}` : null;
  const avatarLetter = firstName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-cyber-bg pb-24 pt-16">
      <Header />

      {/* ── Avatar & info ── */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4 animate-fade-in">
        {/* Avatar circle */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB300)' }}>
            <span className="text-3xl font-black text-white">{avatarLetter}</span>
          </div>
          {/* Online dot */}
          <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-cyber-bg" />
        </div>

        <h2 className="text-xl font-black text-white mt-3 tracking-wide">{firstName}</h2>
        {username && <p className="text-xs text-gray-400 font-mono mt-0.5">{username}</p>}
        {isAdmin && (
          <span className="mt-2 text-[10px] font-black px-3 py-1 rounded-full bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple tracking-widest uppercase">
            👑 Admin
          </span>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            {isUz ? 'Buyurtmalar' : 'Orders'}
          </p>
          <p className="text-3xl font-black text-cyber-purple mt-1">12</p>
        </div>
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            {isUz ? 'Sarflangan' : 'Spent'}
          </p>
          <p className="text-xl font-black text-cyber-cyan mt-1">1,250,000</p>
          <p className="text-[10px] text-gray-500 font-semibold">so'm</p>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="px-4 mt-5 flex flex-col gap-2.5">

        {/* Language */}
        <SettingRow
          iconBg="bg-cyber-purple/15 border border-cyber-purple/25"
          icon={<svg className="w-4 h-4 text-cyber-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
          label={isUz ? 'Til' : 'Language'}
          right={<span className="text-xs text-gray-400 mr-1">{isUz ? "O'zbek" : 'English'}</span>}
          onClick={() => setLanguage(isUz ? 'en' : 'uz')}
        />

        {/* Notifications */}
        <SettingRow
          iconBg="bg-cyber-cyan/15 border border-cyber-cyan/25"
          icon={<svg className="w-4 h-4 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>}
          label={isUz ? 'Bildirishnomalar' : 'Notifications'}
        />

        {/* Support */}
        <SettingRow
          iconBg="bg-blue-500/15 border border-blue-500/25"
          icon={<svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          label={isUz ? "Qo'llab-quvvatlash" : 'Support'}
          sub={isUz ? "Savollar bo'yicha yordam" : 'Get help with questions'}
          href="https://t.me/yashnar"
        />

        {/* About */}
        <SettingRow
          iconBg="bg-emerald-500/15 border border-emerald-500/25"
          icon={<svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>}
          label={isUz ? 'Ilova haqida' : 'About App'}
          onClick={() => setIsAboutOpen(true)}
        />

        {/* Admin panel — faqat admin uchun */}
        {isAdmin && (
          <SettingRow
            iconBg="bg-red-500/15 border border-red-500/25"
            icon={<svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            label="Admin Panel"
            sub="Statistika, buyurtmalar, tizim"
            onClick={() => navigate('/admin')}
          />
        )}
      </div>

      {/* ── About Modal ── */}
      <Modal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} title={isUz ? 'Ilova haqida' : 'About App'}>
        <div className="p-4 pt-2">
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            {isUz
              ? "CyberPay bot — O'zbekistondagi eng yirik va ishonchli geyming do'koni."
              : 'CyberPay bot is the largest and most reliable gaming store in Uzbekistan.'}
          </p>
          <div className="bg-cyber-bg/50 rounded-xl p-4 mb-4 border border-cyber-border">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">
              {isUz ? 'Nega aynan biz?' : 'Why choose us?'}
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              {[
                isUz ? "100% Xavfsiz to'lovlar" : '100% Secure payments',
                isUz ? '24/7 Avtomatlashtirilgan tizim' : '24/7 Automated system',
                isUz ? 'Tezkor yetkazib berish (1 daqiqada)' : 'Instant delivery (in 1 min)',
                isUz ? 'Eng arzon va kafolatlangan narxlar' : 'Cheapest guaranteed prices',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-cyber-border pt-3">
            <div className="flex flex-col gap-1">
              <p>Versiya: <span className="text-white font-mono">2.0.1</span></p>
              <p>Yaratuvchi:{' '}
                <a href="https://t.me/yashnar" target="_blank" rel="noopener noreferrer" className="text-cyber-purple hover:underline">@yashnar</a>
              </p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB300)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </Modal>

      <p className="text-center text-[10px] text-gray-600 font-mono mt-10 tracking-wide uppercase">
        CyberPay • Built with Passion
      </p>

      <BottomNav />
    </div>
  );
}
