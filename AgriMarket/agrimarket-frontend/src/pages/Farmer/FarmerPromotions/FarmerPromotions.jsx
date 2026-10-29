import React, { useEffect } from 'react';
import PromotionsMain from '../../../components/Promotions/PromotionsMain';
import './FarmerPromotions.css';

const FarmerPromotions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fp-page-wrapper" style={{ padding: '24px', background: 'var(--fp-bg)' }}>
      <PromotionsMain role="farmer" />
    </div>
  );
};

export default FarmerPromotions;
