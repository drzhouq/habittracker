import { CSSProperties } from 'react';

export const rewardStyles: Record<string, CSSProperties> = {
  // Credit text styles
  creditText: {
    color: '#333', 
    fontWeight: 'bold'
  },
  
  // Credit needed badge
  creditNeededBadge: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)', 
    padding: '4px 10px', 
    borderRadius: '4px', 
    color: '#6a0dad',
    display: 'inline-block',
    marginTop: '4px'
  },
  
  // Credits needed notification
  creditsNeededNotification: {
    backgroundColor: '#FFF3E0', 
    color: '#D84315',
    fontWeight: 'bold',
    border: '1px solid #FFB74D',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '0.825rem',
    display: 'inline-block',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    textShadow: '0 0 1px rgba(255,255,255,0.5)'
  },
  
  // Concise reward item
  conciseRewardItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'white',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    border: '1px solid rgba(138, 43, 226, 0.15)',
    margin: '2px',
    fontSize: '0.9rem'
  }
}; 