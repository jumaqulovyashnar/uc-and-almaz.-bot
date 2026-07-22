import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Check, Copy } from 'lucide-react';
import { getReferralData, type ReferralData } from '../services/api';
import useStore from '../store/useStore';

const Referrals: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const { telegramUser, language } = useStore();

  const isUz = language === 'uz';
  
  const fallbackLink = telegramUser 
    ? `https://t.me/top_DonateUzbot?startapp=${telegramUser.id}`
    : 'https://t.me/top_DonateUzbot';

  const referralLink = data?.referralLink || fallbackLink;

  useEffect(() => {
    let mounted = true;
    getReferralData().then((res) => {
      if (mounted && res) {
        setData(res);
      }
      if (mounted) {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
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
            {isUz ? 'Referal Tizim' : 'Referral System'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isUz
              ? "Do'stlaringizni taklif qiling va har bir xarididan daromad oling!"
              : 'Invite friends and earn money from every purchase!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card hover className="min-h-[130px]">
            <CardHeader>
              <CardDescription className="text-gray-400">
                {isUz ? "Jami a'zolar" : 'Total Members'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mt-1" />
              ) : (
                <p className="text-2xl font-black text-orange-500">
                  {data?.referralsCount ?? 0} {isUz ? 'ta' : 'members'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card hover className="min-h-[130px]">
            <CardHeader>
              <CardDescription className="text-gray-400">
                {isUz ? "Ishlangan mablag'" : 'Total Earned'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="w-5 h-5 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mt-1" />
              ) : (
                <p className="text-xl font-black text-cyber-cyan">
                  {(data?.referralBalance ?? 0).toLocaleString(isUz ? 'uz-UZ' : 'en-US')} {isUz ? "so'm" : 'UZS'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isUz ? 'Sizning taklif havolangiz' : 'Your Referral Link'}</CardTitle>
            <CardDescription>
              {isUz
                ? "Ushbu havolani nusxalang va do'stlaringizga yuboring:"
                : 'Copy this link and send it to your friends:'}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-3">
            <div className="flex gap-2 bg-cyber-bg/50 border border-cyber-border rounded-none p-3 items-center justify-between">
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyber-cyan hover:underline overflow-hidden text-ellipsis whitespace-nowrap pr-2"
              >
                {referralLink}
              </a>
              <Button
                variant="primary"
                size="sm"
                className={`whitespace-nowrap py-1 px-3 min-h-[32px] text-xs font-semibold transition-all duration-300 ${
                  copied ? '!bg-green-600 !text-white hover:!bg-green-600' : ''
                }`}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={handleCopy}
              >
                {copied ? (isUz ? 'Nusxalandi!' : 'Copied!') : (isUz ? 'Nusxa olish' : 'Copy Link')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referred Users */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isUz ? 'Taklif qilgan odamlar' : 'Referred Users'}</CardTitle>
            <CardDescription>
              {isUz
                ? "Sizning havolangiz orqali qo'shilgan foydalanuvchilar:"
                : 'Users who joined via your referral link:'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : data && data.referredUsers && data.referredUsers.length > 0 ? (
              <div className="space-y-3">
                {data.referredUsers.map((user) => (
                  <div key={user.id} className="flex justify-between items-center text-xs border-b border-cyber-border/40 pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <p className="text-white font-bold">{user.firstName || (isUz ? 'Foydalanuvchi' : 'User')}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">ID: {user.telegramId}</p>
                    </div>
                    <span className="text-gray-400 text-[10px]">{new Date(user.joinedAt).toLocaleDateString(isUz ? 'uz-UZ' : 'en-US')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">
                {isUz ? "Hozircha taklif qilingan odamlar yo'q" : 'No referred users yet'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Earnings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isUz ? "So'nggi keshbeklar" : 'Recent Cashback'}</CardTitle>
            <CardDescription>
              {isUz
                ? "Do'stlaringiz xaridlaridan tushgan daromadlar:"
                : 'Income earned from your friends purchases:'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : data && data.recentEarnings.length > 0 ? (
              <div className="space-y-3">
                {data.recentEarnings.map((earning, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-cyber-border/40 pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <p className="text-white font-bold">{earning.fromUser}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{new Date(earning.date).toLocaleString(isUz ? 'uz-UZ' : 'en-US')}</p>
                    </div>
                    <span className="text-cyber-cyan font-bold font-mono">
                      +{earning.amount.toLocaleString(isUz ? 'uz-UZ' : 'en-US')} {isUz ? "so'm" : 'UZS'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">
                {isUz ? 'Hozircha keshbeklar mavjud emas' : 'No cashback earned yet'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="mb-2">{isUz ? 'Bu qanday ishlaydi?' : 'How It Works?'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-none bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-500 shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isUz ? 'Taklif qiling' : 'Invite Friends'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isUz
                    ? "Taklif havolangizni do'stlaringizga ijtimoiy tarmoqlar orqali yuboring."
                    : 'Send your invitation link to friends via social networks.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-none bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-500 shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isUz ? 'Xarid amalga oshirishsin' : 'Make Purchases'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isUz
                    ? "Do'stingiz botga kirib, PUBG UC yoki Free Fire Diamonds sotib olsin."
                    : 'Your friend enters the bot and buys PUBG UC or Free Fire Diamonds.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-none bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-500 shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isUz ? 'Keshbek oling (5%)' : 'Get Cashback (5%)'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isUz
                    ? "Do'stingiz to'lagan har bir tranzaksiyadan 5% sizning hisobingizga o'tadi!"
                    : 'Get 5% cashback transferred to your balance for every transaction!' }
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
