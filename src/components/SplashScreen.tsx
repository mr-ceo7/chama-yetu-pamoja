import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useCampaign } from '../context/CampaignContext';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { activeCampaign, isLoading } = useCampaign();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, isLoading ? 3000 : 2500);
    return () => clearTimeout(timer);
  }, [onComplete, isLoading]);

  const showCampaignSplash = activeCampaign?.use_splash_screen && activeCampaign?.asset_image_url;
  const campaignColor = activeCampaign?.theme_color_hex;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: showCampaignSplash && campaignColor
            ? `radial-gradient(circle at center, ${campaignColor}40 0%, transparent 70%)`
            : 'radial-gradient(circle at center, rgba(37,99,235,0.3) 0%, transparent 70%)'
        }}
      />

      <motion.div
        className="flex flex-col items-center justify-center gap-6"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {showCampaignSplash ? (
          <img
            src={activeCampaign.asset_image_url!}
            alt={activeCampaign.title}
            className="w-full max-w-md px-6 h-auto object-contain rounded-2xl"
            style={{ filter: `drop-shadow(0 0 40px ${campaignColor}50)` }}
          />
        ) : (
          <>
            <img
              src="/cyp-logo.png"
              alt="Chama Yetu Pamoja"
              className="w-28 h-28 object-contain rounded-full"
              style={{ filter: 'drop-shadow(0 0 30px rgba(37,99,235,0.4))' }}
            />
            <div className="text-center">
              <h1 className="text-2xl font-display font-black text-white tracking-tight mb-1">
                CHAMA YETU PAMOJA
              </h1>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-[0.3em]">
                Win Together, Grow Together
              </p>
            </div>
          </>
        )}
        {showCampaignSplash && activeCampaign.banner_text && (
          <motion.p
            className="text-center text-sm font-bold text-zinc-300 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {activeCampaign.banner_text}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
