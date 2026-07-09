import React, { useState } from 'react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const Referrals: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://t.me/top_DonateUzbot?start=6709001451';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    // Telegram haptic feedback if available
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-cyber-bg pb-28 pt-20">
      <Header />

      <div className="px-4">
        {/* Title Section */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">
            Referal Tizim
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Do'stlaringizni taklif qiling va har bir xarididan daromad oling!
          </p>
        </div>

        {/* Stats Grid using Shadcn Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card hover>
            <CardHeader>
              <CardDescription className="text-gray-400">Jami a'zolar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-cyber-purple">12 ta</p>
            </CardContent>
          </Card>

          <Card hover>
            <CardHeader>
              <CardDescription className="text-gray-400">Ishlangan mablag'</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-black text-cyber-cyan">45,000 so'm</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sizning taklif havolangiz</CardTitle>
            <CardDescription>Ushbu havolani nusxalang va do'stlaringizga yuboring:</CardDescription>
          </CardHeader>
          <CardContent className="mt-3">
            <div className="flex gap-2 bg-cyber-bg/50 border border-cyber-border rounded-xl p-3 items-center justify-between">
              <span className="text-xs text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap select-all pr-2">
                {referralLink}
              </span>
              <Button
                variant="primary"
                size="sm"
                className={`whitespace-nowrap py-1 px-3 min-h-[32px] text-xs font-semibold transition-all duration-300 ${
                  copied ? '!bg-green-600 !text-white hover:!bg-green-600' : ''
                }`}
                onClick={handleCopy}
              >
                {copied ? 'Nusxalandi! ✓' : 'Nusxa olish'}
              </Button>

            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="mb-2">Bu qanday ishlaydi?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center text-xs font-bold text-cyber-purple shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Taklif qiling</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Taklif havolangizni do'stlaringizga ijtimoiy tarmoqlar orqali yuboring.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center text-xs font-bold text-cyber-purple shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Xarid amalga oshirishsin</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Do'stingiz botga kirib, PUBG UC yoki Free Fire Diamonds sotib olsin.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center text-xs font-bold text-cyber-purple shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Keshbek oling (5%)</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Do'stingiz to'lagan har bir tranzaksiyadan 5% sizning hisobingizga o'tadi!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Referrals;
