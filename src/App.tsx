import { useState } from 'react';
import { MainLayout } from './components/layout';
import { LandingPage, LearnMorePage } from './components/pages';
import { useLoadSharedState } from './hooks/useLoadSharedState';
import { useAuthStore } from './stores/useAuthStore';

type MarketingPage = 'landing' | 'learn-more';

function App() {
  const { isAuthenticated, login } = useAuthStore();
  const [marketingPage, setMarketingPage] = useState<MarketingPage>('landing');

  // Load shared state from URL on startup
  useLoadSharedState();

  const handleGetStarted = () => {
    login('demo@robosim.dev');
  };

  if (!isAuthenticated) {
    if (marketingPage === 'learn-more') {
      return (
        <LearnMorePage
          onBack={() => setMarketingPage('landing')}
          onGetStarted={handleGetStarted}
        />
      );
    }
    return (
      <LandingPage
        onLogin={handleGetStarted}
        onLearnMore={() => setMarketingPage('learn-more')}
      />
    );
  }

  return <MainLayout />;
}

export default App;
