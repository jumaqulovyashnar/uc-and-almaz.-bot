import React from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import useStore from '../store/useStore';

export default function Profile() {
  const { language, theme } = useStore();

  const isUz = language === 'uz';

  return (
    <div className="pt-20 pb-24 px-4 bg-cyber-bg min-h-screen">
      <Header />

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

        {/* About (without version label) */}
        <Card hover className="p-4">
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

      {/* App version footer (without version label v2.0) */}
      <p className="text-center text-[10px] text-gray-600 font-mono mt-12 tracking-wide uppercase">
        CyberPay • Built with Passion
      </p>

      <BottomNav />
    </div>
  );
}
