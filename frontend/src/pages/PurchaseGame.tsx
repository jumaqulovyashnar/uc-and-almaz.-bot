import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';
import { getDynamicProducts, verifyPlayer, type DynamicProduct } from '../services/api';
import Input from '../components/ui/Input';

interface PackageCardProps {
  pkg: DynamicProduct;
  isSelected: boolean;
  onClick: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, isSelected, onClick }) => {
  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div
      onClick={onClick}
      className={`
        flex justify-between items-center px-4 py-4 bg-cyber-card border cursor-pointer transition-all rounded-none w-full select-none
        ${isSelected
          ? 'border-[#c6f806] ring-1 ring-[#c6f806]/20'
          : 'border-cyber-border hover:border-white/10'
        }
      `}
    >
      <span className="font-extrabold text-white text-sm">{pkg.name}</span>
      <div className="text-right">
        <span className="text-[#c6f806] font-black text-sm">{formatPrice(pkg.price_uzs)}</span>
        <span className="text-gray-400 text-[11px] font-semibold ml-1">so'm</span>
      </div>
    </div>
  );
};

export default function PurchaseGame() {
  const { gameKey } = useParams<{ gameKey: string }>();
  const navigate = useNavigate();
  
  const {
    selectedPackage,
    playerId,
    playerNickname,
    isVerified,
    language,
    serverId,
    setGame,
    setPackage,
    setPlayerId,
    setServerId,
    setNickname,
    setVerified,
  } = useStore();

  const isUz = language === 'uz';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [requiresServer, setRequiresServer] = useState(false);
  const [idLabel, setIdLabel] = useState('Player ID');
  const [hasValidator, setHasValidator] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    if (!gameKey) return;
    
    setGame(gameKey);
    setLoading(true);
    setError(null);
    
    getDynamicProducts(gameKey)
      .then((data) => {
        if (data) {
          setProducts(data.products);
          setRequiresServer(data.requires_server);
          setIdLabel(data.id_label);
          setHasValidator(data.has_validator);
        } else {
          setError(isUz ? "Mahsulotlarni yuklashda xatolik" : "Failed to load products");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(isUz ? "Tizimda xatolik yuz berdi" : "A system error occurred");
        setLoading(false);
      });
  }, [gameKey, setGame, isUz]);

  const formatPrice = (price: number) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const gameDisplayName = gameKey ? gameKey.replace(/-/g, ' ').toUpperCase() : 'GAME';

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg pb-36">
      {/* Back button */}
      <div className="p-4 flex items-center">
        <button
          onClick={() => navigate('/home')}
          className="bg-black/40 border border-white/20 text-gray-300 hover:text-white px-3 py-1.5 font-extrabold text-[11px] tracking-wider rounded-none transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isUz ? 'ORQAGA' : 'BACK'}
        </button>
      </div>

      {error && (
        <div className="px-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold rounded-none">
            {error}
          </div>
        </div>
      )}

      {/* ── Section 02: SELECT PRODUCT ── */}
      <div className="px-4 mt-2 animate-fade-in">
        <div className="flex items-center mb-3">
          <span className="bg-[#c6f806] text-black font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">02</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? 'PAKETNI TANLA' : 'SELECT PRODUCT'}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Game Title Bar */}
        <div className="bg-[#121118] border-l-[3px] border-[#c6f806] px-3.5 py-2.5 flex items-center gap-2 rounded-none mb-4">
          <span className="text-sm">🎮</span>
          <span className="font-black text-white text-xs tracking-wider uppercase">{gameDisplayName}</span>
        </div>

        {/* Dynamic products list */}
        {products.length === 0 ? (
          <p className="text-gray-500 text-xs py-4 text-center">
            {isUz ? "Hozircha paketlar yo'q" : "No packages available"}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {products.map((pkg) => (
              <PackageCard
                key={pkg.product_id}
                pkg={pkg}
                isSelected={selectedPackage?.id === pkg.product_id}
                onClick={() => {
                  setPackage({
                    id: pkg.product_id,
                    name: pkg.name,
                    amount: parseInt(pkg.name) || 0,
                    price: pkg.price_uzs,
                    game: gameKey || '',
                    category: 'package',
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 03: ENTER DETAILS ── */}
      <div className="px-4 mt-8 animate-fade-in">
        <div className="flex items-center mb-4">
          <span className="bg-[#c6f806] text-black font-extrabold px-1.5 py-0.5 text-[10px] rounded-none">03</span>
          <span className="text-white font-black tracking-wider text-[11px] ml-2 uppercase">
            {isUz ? "MA'LUMOTLARNI KIRIT" : "ENTER DETAILS"}
          </span>
          <div className="flex-1 h-[1px] bg-white/10 ml-3" />
        </div>

        {/* Selected package block */}
        {selectedPackage && (
          <div className="border border-[#c6f806] bg-cyber-card px-4 py-4 flex justify-between items-center rounded-none mb-4 animate-fade-in w-full">
            <span className="font-extrabold text-white text-sm">{selectedPackage.name}</span>
            <div className="text-right">
              <span className="text-[#c6f806] font-black text-sm">{formatPrice(selectedPackage.price)}</span>
              <span className="text-gray-400 text-[11px] font-semibold ml-1">so'm</span>
            </div>
          </div>
        )}

        {/* Input Fields */}
        {selectedPackage && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                {idLabel.toUpperCase()}
              </p>
              <Input
                placeholder={`${idLabel} ${isUz ? 'kiriting...' : 'here...'}`}
                value={playerId}
                roundedClassName="rounded-none"
                containerClassName="border-[#201E29] focus-within:border-[#c6f806] focus-within:ring-[#c6f806]/40"
                onChange={(e) => setPlayerId(e.target.value)}
              />
            </div>

            {requiresServer && (
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                  {isUz ? 'SERVER ID' : 'SERVER ID'}
                </p>
                <Input
                  placeholder={isUz ? 'Server ID kiriting...' : 'Enter server ID...'}
                  value={serverId}
                  roundedClassName="rounded-none"
                  containerClassName="border-[#201E29] focus-within:border-[#c6f806] focus-within:ring-[#c6f806]/40"
                  onChange={(e) => setServerId(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed bottom buy bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-cyber-bg/90 backdrop-blur-xl border-t border-cyber-border p-4 pb-safe">
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {selectedPackage ? (
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] text-gray-500">{isUz ? 'Tanlangan:' : 'Selected:'}</p>
                <p className="text-white font-bold text-sm">{selectedPackage.name}</p>
              </div>
              <p className="text-cyber-purple font-black text-base">
                {formatPrice(selectedPackage.price)} <span className="text-xs font-normal text-gray-400">so'm</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-xs font-semibold text-center mb-3">
              {isUz ? "Mahsulot tanlang" : 'Choose a product'}
            </p>
          )}
          <button
            disabled={!selectedPackage || !playerId || (requiresServer && !serverId)}
            onClick={() => navigate('/checkout')}
            className="w-full rounded-none bg-[#c6f806] hover:bg-[#b0dc05] active:scale-[0.99] text-black font-black text-sm uppercase py-4 tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isUz ? 'DAVOM ETISH' : 'CONTINUE'}</span>
            <span className="text-base font-bold">➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
