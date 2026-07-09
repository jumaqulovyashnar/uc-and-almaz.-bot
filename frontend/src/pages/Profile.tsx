import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Card } from '../components/ui/Card';

export default function Profile() {
  return (
    <div className="pt-16 pb-24 px-4">
      <Header />

      {/* User avatar */}
      <div className="mt-4 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyber-purple to-cyber-cyan flex items-center justify-center">
          <span className="text-2xl font-bold text-white">F</span>
        </div>
        <h2 className="text-lg font-semibold text-white text-center mt-3">
          Foydalanuvchi
        </h2>
        <p className="text-sm text-gray-500 text-center">@cyberpay_user</p>
        <p className="text-xs text-gray-600 text-center mt-1">
          A'zo: Iyul 2024
        </p>
      </div>

      {/* Stats row */}
      <div className="mt-6 flex gap-3">
        <Card className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">Jami buyurtmalar</p>
          <p className="text-xl font-bold text-cyber-purple">12</p>
        </Card>
        <Card className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">Jami sarflangan</p>
          <p className="text-lg font-bold text-cyber-cyan">1,250,000 so'm</p>
        </Card>
      </div>

      {/* Settings list */}
      <div className="mt-6 flex flex-col gap-2">
        {/* Language */}
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-white text-sm">Til</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">O'zbekcha</span>
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
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="text-white text-sm">Bildirishnomalar</span>
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

        {/* About */}
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="text-white text-sm">Ilova haqida</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">v2.0</span>
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
      </div>

      {/* App version */}
      <p className="text-center text-xs text-gray-700 mt-8">
        CyberPay v2.0 • Built with 💜
      </p>

      <BottomNav />
    </div>
  );
}
