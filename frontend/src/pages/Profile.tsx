import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import useStore from '../store/useStore';
import Modal from '../components/ui/Modal';

export default function Profile() {
  const navigate = useNavigate();
  const { language } = useStore();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const isUz = language === 'uz';

  return (
    <div className="pt-16 pb-24 px-4 bg-cyber-bg min-h-screen">
      <Header />

      {/* Back button */}
      <div className="mt-4 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span className="text-sm font-semibold">{isUz ? 'Ortga' : 'Back'}</span>
        </button>
      </div>

      {/* User avatar */}
      <div className="mt-4 flex flex-col items-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyber-purple to-cyber-cyan flex items-center justify-center shadow-lg">
          <span className="text-2xl font-black text-white">F</span>
        </div>
        <h2 className="text-xl font-black text-white text-center mt-3 tracking-wide">
          {isUz ? 'Foydalanuvchi' : 'User'}
        </h2>
        <p className="text-xs text-gray-400 text-center font-mono mt-1">@cyberpay_user</p>
        <p className="text-[11px] text-gray-500 text-center mt-1">
          {isUz ? "A'zo: Iyul 2024" : 'Member since: July 2024'}
        </p>
      </div>

      {/* Stats row using Shadcn-like components */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Card hover className="text-center">
          <CardHeader className="p-0">
            <CardDescription className="text-[11px] uppercase tracking-wider text-gray-500">
              {isUz ? 'Jami buyurtmalar' : 'Total Orders'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <p className="text-3xl font-black text-cyber-purple">12</p>
          </CardContent>
        </Card>

        <Card hover className="text-center">
          <CardHeader className="p-0">
            <CardDescription className="text-[11px] uppercase tracking-wider text-gray-500">
              {isUz ? 'Jami sarflangan' : 'Total Spent'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <p className="text-lg font-black text-cyber-cyan">1,250,000</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">so'm</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings list using Shadcn-like components */}
      <div className="mt-8 flex flex-col gap-3">
        {/* Language */}
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyber-purple/10 border border-cyber-purple/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cyber-purple"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold">{isUz ? 'Til' : 'Language'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-medium">
                {isUz ? "O'zbekcha" : 'English'}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cyber-cyan"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold">
                {isUz ? 'Bildirishnomalar' : 'Notifications'}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </Card>

        {/* Support */}
        <a href="https://t.me/yashnar" target="_blank" rel="noopener noreferrer">
          <Card hover className="p-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold">
                    {isUz ? "Qo'llab-quvvatlash" : 'Support'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {isUz ? "Savollar bo'yicha yordam" : 'Get help with questions'}
                  </span>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Card>
        </a>

        {/* About (without version label) */}
        <div onClick={() => setIsAboutOpen(true)}>
          <Card hover className="p-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <span className="text-white text-sm font-semibold">
                  {isUz ? 'Ilova haqida' : 'About App'}
                </span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Card>
        </div>
      </div>

      {/* About Modal */}
      <Modal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} title={isUz ? 'Ilova haqida' : 'About App'}>
        <div className="p-4 pt-2">
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            {isUz 
              ? 'CyberPay bot — O\'zbekistondagi eng yirik va ishonchli geyming do\'koni. Biz orqali siz turli xil o\'yin paketlarini eng arzon narxlarda xarid qilishingiz mumkin.' 
              : 'CyberPay bot is the largest and most reliable gaming store in Uzbekistan. Purchase various game packages at the cheapest prices.'}
          </p>
          
          <div className="bg-cyber-bg/50 rounded-xl p-4 mb-4 border border-cyber-border">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">
              {isUz ? 'Nega aynan biz?' : 'Why choose us?'}
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-cyber-cyan">✓</span> {isUz ? '100% Xavfsiz to\'lovlar' : '100% Secure payments'}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyber-cyan">✓</span> {isUz ? '24/7 Avtomatlashtirilgan tizim' : '24/7 Automated system'}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyber-cyan">✓</span> {isUz ? 'Tezkor yetkazib berish (1 daqiqada)' : 'Instant delivery (in 1 min)'}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyber-cyan">✓</span> {isUz ? 'Eng arzon va kafolatlangan narxlar' : 'Cheapest guaranteed prices'}
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-cyber-border pt-3 mt-2">
            <div className="flex flex-col gap-1">
              <p>Versiya: <span className="text-white font-mono">2.0.1</span></p>
              <p>Yaratuvchi: <a href="https://t.me/yashnar" target="_blank" rel="noopener noreferrer" className="text-cyber-purple hover:underline">@yashnar</a></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-purple to-cyber-cyan flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </Modal>

      {/* App version footer (without version label v2.0) */}
      <p className="text-center text-[10px] text-gray-600 font-mono mt-12 tracking-wide uppercase">
        CyberPay • Built with Passion
      </p>

      <BottomNav />
    </div>
  );
}

