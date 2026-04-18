import React, { createContext, useContext, useState, useEffect } from 'react';
import { campaignService } from '../services/campaignService';
import type { Campaign } from '../services/adminService';

interface CampaignContextType {
  activeCampaign: Campaign | null;
  isLoading: boolean;
}

const CampaignContext = createContext<CampaignContextType>({
  activeCampaign: null,
  isLoading: true,
});

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Campaign fetching temporarily disabled to prevent 404 console errors
    setIsLoading(false);
  }, []);

  return (
    <CampaignContext.Provider value={{ activeCampaign, isLoading }}>
      {children}
    </CampaignContext.Provider>
  );
};
