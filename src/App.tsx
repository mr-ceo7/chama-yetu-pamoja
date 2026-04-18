/**
 * Chama Yetu Pamoja — Main Application
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Layout } from './components/layout/Layout';
import { TipsPage } from './pages/TipsPage';
import { MagicLoginPage } from './pages/MagicLoginPage';
import { SplashScreen } from './components/SplashScreen';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import { ResponsibleGambling } from './pages/legal/ResponsibleGambling';
import { RefundPolicy } from './pages/legal/RefundPolicy';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AboutUsPage } from './pages/AboutUsPage';

// Admin
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { TipsManagePage } from './pages/admin/TipsManagePage';
import { RevenuePage } from './pages/admin/RevenuePage';
import { PricingManagePage } from './pages/admin/PricingManagePage';
import { BroadcastPage } from './pages/admin/BroadcastPage';
import { AdsManagePage } from './pages/admin/AdsManagePage';
import { SettingsManagePage } from './pages/admin/SettingsManagePage';
import { CampaignsManagePage } from './pages/admin/CampaignsManagePage';
import { CampaignProvider, useCampaign } from './context/CampaignContext';

function CampaignMetaManager() {
  const { activeCampaign } = useCampaign();
  
  React.useEffect(() => {
    if (activeCampaign && activeCampaign.asset_image_url) {
      let metaOgImg = document.querySelector('meta[property="og:image"]');
      if (!metaOgImg) {
        metaOgImg = document.createElement('meta');
        metaOgImg.setAttribute('property', 'og:image');
        document.head.appendChild(metaOgImg);
      }
      metaOgImg.setAttribute('content', activeCampaign.asset_image_url);

      let metaTwitterImg = document.querySelector('meta[name="twitter:image"]');
      if (!metaTwitterImg) {
        metaTwitterImg = document.createElement('meta');
        metaTwitterImg.setAttribute('name', 'twitter:image');
        document.head.appendChild(metaTwitterImg);
      }
      metaTwitterImg.setAttribute('content', activeCampaign.asset_image_url);
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && activeCampaign.description) {
         metaDesc.setAttribute('content', activeCampaign.description);
      }
    }
  }, [activeCampaign]);
  return null;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      <CampaignProvider>
        <BrowserRouter>
          <CampaignMetaManager />
          <Routes>
            {/* Public site */}
            <Route element={<Layout />}>
              <Route path="/" element={<TipsPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/responsible-gambling" element={<ResponsibleGambling />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/welcome" element={<MagicLoginPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Admin console */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="tips" element={<TipsManagePage />} />
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="pricing" element={<PricingManagePage />} />
              <Route path="broadcast" element={<BroadcastPage />} />
              <Route path="ads" element={<AdsManagePage />} />
              <Route path="campaigns" element={<CampaignsManagePage />} />
              <Route path="settings" element={<SettingsManagePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CampaignProvider>
    </>
  );
}
